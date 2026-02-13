import { Request, Response } from 'express'
import { and, desc, eq, ilike, lt, or, sql } from 'drizzle-orm'
import { db } from '../lib/db.js'
import { notice, type NewNotice } from '../models/notice-schema.js'
import { UPLOAD_CONSTANTS, generatePublicId } from '../config/cloudinary.js'
import { uploadAssignmentFileToCloudinary } from '../services/cloudinary.service.js'
import {
  createInAppNotificationForAudience,
  deleteNoticeNotificationsByNoticeId,
} from '../services/inAppNotification.service.js'
import { sendToTopic } from '../services/notification.service.js'
import { syncExamNotices } from '../services/notice-sync.service.js'

type AuthedRequest = Request & { user?: { id: string; role?: string | null } }

type NoticeCategory =
  | 'results'
  | 'application_forms'
  | 'exam_centers'
  | 'general'

const VALID_CATEGORIES: NoticeCategory[] = [
  'results',
  'application_forms',
  'exam_centers',
  'general',
]

const isNoticeManager = (req: AuthedRequest): boolean => {
  const role = req.user?.role
  return role === 'notice_manager'
}

const { NOTICE_ATTACHMENTS, FOLDERS } = UPLOAD_CONSTANTS

const isImageUrl = (url?: string | null) =>
  !!url && /\.(jpg|jpeg|png|webp|gif|avif|svg)(\?.*)?$/i.test(url)

function mapLegacySectionToCategory(section: string): NoticeCategory | null {
  if (section === 'results') return 'results'
  if (section === 'routines') return 'general'
  return null
}

function normalizeCategoryInput(
  rawCategory?: string | null,
  rawSection?: string | null,
): NoticeCategory | null {
  const category = (rawCategory ?? '').trim().toLowerCase()
  if (category && VALID_CATEGORIES.includes(category as NoticeCategory)) {
    return category as NoticeCategory
  }

  const section = (rawSection ?? '').trim().toLowerCase()
  if (section) {
    return mapLegacySectionToCategory(section)
  }

  return null
}

function makeLegacySubsection(category: NoticeCategory): string {
  if (category === 'results') return 'be'
  if (category === 'application_forms') return 'msc'
  if (category === 'exam_centers') return 'be'
  return 'msc'
}

function toLegacySection(category: string): string {
  if (category === 'results' || category === 'application_forms')
    return 'results'
  return 'routines'
}

function noticeSortTimestampSql() {
  return sql<Date>`
    coalesce(
      case
        when ${notice.publishedDate} ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
          then (${notice.publishedDate}::date)::timestamp
        when ${notice.publishedDate} ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}[T\\s][0-9]{2}:[0-9]{2}'
          then ${notice.publishedDate}::timestamp
        else null
      end,
      ${notice.createdAt}
    )
  `
}

type NoticeCursor = {
  sortAt: Date
  id: number
}

function encodeNoticeCursor(input: NoticeCursor): string {
  const raw = `${input.sortAt.toISOString()}|${input.id}`
  return Buffer.from(raw, 'utf8').toString('base64url')
}

function decodeNoticeCursor(rawCursor?: string | null): NoticeCursor | null {
  if (!rawCursor) return null
  try {
    const decoded = Buffer.from(rawCursor, 'base64url').toString('utf8')
    const [sortAtRaw, idRaw] = decoded.split('|')
    if (!sortAtRaw || !idRaw) return null
    const sortAt = new Date(sortAtRaw)
    const id = Number(idRaw)
    if (Number.isNaN(sortAt.getTime()) || !Number.isFinite(id) || id <= 0) {
      return null
    }
    return { sortAt, id: Math.floor(id) }
  } catch {
    return null
  }
}

// Get all notices (with optional filtering)
export async function getNotices(req: Request, res: Response) {
  try {
    const category = normalizeCategoryInput(
      req.query.category as string | undefined,
      req.query.section as string | undefined,
    )
    const level =
      (req.query.level as string | undefined)?.trim() ??
      (req.query.subsection as string | undefined)?.trim()
    const search = (req.query.search as string | undefined)?.trim()
    const parsedLimit = Number(req.query.limit)
    const parsedOffset = Number(req.query.offset)
    const limit =
      Number.isFinite(parsedLimit) && parsedLimit > 0
        ? Math.min(Math.floor(parsedLimit), 100)
        : 5
    const offset =
      Number.isFinite(parsedOffset) && parsedOffset >= 0
        ? Math.floor(parsedOffset)
        : 0
    const cursor = decodeNoticeCursor(req.query.cursor as string | undefined)

    const baseFilters: any[] = []
    if (category) baseFilters.push(eq(notice.category, category))
    if (level) baseFilters.push(eq(notice.level, level))
    if (search) {
      const term = `%${search}%`
      baseFilters.push(ilike(notice.title, term))
    }

    const baseWhere =
      baseFilters.length > 1
        ? and(...baseFilters)
        : baseFilters.length === 1
          ? baseFilters[0]
          : undefined

    const sortTimestamp = noticeSortTimestampSql()

    const cursorWhere = cursor
      ? or(
          sql`${sortTimestamp} < ${cursor.sortAt}`,
          and(
            sql`${sortTimestamp} = ${cursor.sortAt}`,
            lt(notice.id, cursor.id),
          ),
        )
      : undefined

    const whereClause = cursorWhere
      ? baseWhere
        ? and(baseWhere, cursorWhere)
        : cursorWhere
      : baseWhere

    const [totalRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(notice)
      .where(baseWhere)

    const [newRow] = await db
      .select({
        count: sql<number>`count(*)::int`,
      })
      .from(notice)
      .where(
        baseWhere
          ? and(baseWhere, sql`${sortTimestamp} >= now() - interval '7 days'`)
          : sql`${sortTimestamp} >= now() - interval '7 days'`,
      )

    const rawResults = await db
      .select({
        id: notice.id,
        title: notice.title,
        content: sql<string>`''`,
        section: sql<string>`
          CASE
            WHEN ${notice.category} IN ('results', 'application_forms') THEN 'results'
            ELSE 'routines'
          END
        `,
        category: notice.category,
        level: notice.level,
        subsection: sql<string>`coalesce(${notice.level}, 'be')`,
        attachmentUrl: notice.attachmentUrl,
        publishedDate: notice.publishedDate,
        sourceUrl: notice.sourceUrl,
        externalRef: notice.externalRef,
        createdAt: notice.createdAt,
        updatedAt: notice.updatedAt,
      })
      .from(notice)
      .where(whereClause)
      .orderBy(desc(sortTimestamp), desc(notice.id))
      .limit(limit + 1)
      .offset(cursor ? 0 : offset)

    const hasMore = rawResults.length > limit
    const results = hasMore ? rawResults.slice(0, limit) : rawResults
    const lastItem = results.length > 0 ? results[results.length - 1] : null
    const nextCursor =
      hasMore && lastItem
        ? encodeNoticeCursor({
            sortAt: new Date(
              (() => {
                const raw = lastItem.publishedDate?.trim()
                if (raw) {
                  const parsed = new Date(raw)
                  if (!Number.isNaN(parsed.getTime()))
                    return parsed.toISOString()
                }
                return lastItem.createdAt
              })(),
            ),
            id: lastItem.id,
          })
        : null

    return res.json({
      success: true,
      data: results,
      meta: {
        total: totalRow?.count ?? 0,
        newCount: newRow?.count ?? 0,
        limit,
        offset: cursor ? 0 : offset,
        hasMore,
        nextCursor,
      },
    })
  } catch (error: any) {
    console.error('Error fetching notices:', error)
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch notices',
    })
  }
}

// Get a single notice
export async function getNotice(req: Request, res: Response) {
  try {
    const noticeId = Number(req.params.id)
    if (!noticeId || Number.isNaN(noticeId)) {
      return res
        .status(400)
        .json({ success: false, message: 'Invalid notice ID' })
    }

    const [found] = await db
      .select()
      .from(notice)
      .where(eq(notice.id, noticeId))

    if (!found) {
      return res
        .status(404)
        .json({ success: false, message: 'Notice not found' })
    }

    return res.json({ success: true, data: found })
  } catch (error: any) {
    console.error('Error fetching notice:', error)
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch notice',
    })
  }
}

// Get notice stats
export async function getNoticeStats(_req: Request, res: Response) {
  try {
    const [stats] = await db
      .select({
        // Keep stats aligned with legacy UI filters:
        // section=results => categories(results, application_forms)
        // section=routines => categories(exam_centers, general)
        beResults: sql<number>`count(*) filter (where ${notice.category} in ('results', 'application_forms') and coalesce(${notice.level}, 'be') = 'be')::int`,
        mscResults: sql<number>`count(*) filter (where ${notice.category} in ('results', 'application_forms') and coalesce(${notice.level}, 'be') = 'msc')::int`,
        beRoutines: sql<number>`count(*) filter (where ${notice.category} in ('exam_centers', 'general') and coalesce(${notice.level}, 'be') = 'be')::int`,
        mscRoutines: sql<number>`count(*) filter (where ${notice.category} in ('exam_centers', 'general') and coalesce(${notice.level}, 'be') = 'msc')::int`,
        results: sql<number>`count(*) filter (where ${notice.category} = 'results')::int`,
        applicationForms: sql<number>`count(*) filter (where ${notice.category} = 'application_forms')::int`,
        examCenters: sql<number>`count(*) filter (where ${notice.category} = 'exam_centers')::int`,
        general: sql<number>`count(*) filter (where ${notice.category} = 'general')::int`,
        newCount: sql<number>`count(*) filter (where ${notice.createdAt} >= now() - interval '7 days')::int`,
        total: sql<number>`count(*)::int`,
      })
      .from(notice)

    const normalizedStats = stats ?? {
      beResults: 0,
      mscResults: 0,
      beRoutines: 0,
      mscRoutines: 0,
      results: 0,
      applicationForms: 0,
      examCenters: 0,
      general: 0,
      newCount: 0,
      total: 0,
    }

    return res.json({ success: true, data: normalizedStats })
  } catch (error: any) {
    console.error('Error fetching notice stats:', error)
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch notice stats',
    })
  }
}

// Create a new notice (notice_manager only)
export async function createNotice(req: AuthedRequest, res: Response) {
  try {
    if (!req.user || !isNoticeManager(req)) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized. Only notice managers can create notices.',
      })
    }

    const body = req.body ?? {}
    const {
      title,
      category: rawCategory,
      section: rawSection,
      level: rawLevel,
      subsection,
      attachmentUrl,
      publishedDate,
      sourceUrl,
      externalRef,
    } = body

    const category = normalizeCategoryInput(rawCategory, rawSection)

    if (!title || !category) {
      return res.status(400).json({
        success: false,
        message: 'Title and category are required',
      })
    }

    const normalizedLevel =
      (rawLevel as string | null | undefined)?.trim() ||
      (subsection as string | null | undefined)?.trim() ||
      makeLegacySubsection(category)

    const newNotice: NewNotice = {
      title,
      category,
      level: normalizedLevel,
      attachmentUrl: attachmentUrl || null,
      publishedDate: publishedDate || null,
      sourceUrl: sourceUrl || null,
      externalRef: externalRef || null,
    }

    const [created] = await db.insert(notice).values(newNotice).returning()

    await Promise.allSettled([
      createInAppNotificationForAudience({
        audience: 'all',
        type: 'notice_created',
        title: 'New Notice Published',
        body: title,
        data: {
          noticeId: created.id,
          noticeTitle: created.title,
          category,
          section: toLegacySection(category),
          level: normalizedLevel,
          subsection: normalizedLevel,
          publisherId: req.user.id,
          iconKey: 'notice',
          ...(isImageUrl(created.attachmentUrl)
            ? { thumbnailUrl: created.attachmentUrl as string }
            : {}),
        },
      }).catch((error) =>
        console.error('Failed to create notice in-app notification:', error),
      ),

      sendToTopic('announcements', {
        title: 'New Notice Published',
        body: title,
        data: {
          noticeId: created.id.toString(),
          type: 'notice_created',
          category,
          section: toLegacySection(category),
          level: normalizedLevel,
          subsection: normalizedLevel,
          publisherId: req.user.id,
          iconKey: 'notice',
        },
      }).catch((error) =>
        console.error('Failed to send notice FCM topic notification:', error),
      ),
    ])

    return res.json({
      success: true,
      message: 'Notice created successfully',
      data: created,
    })
  } catch (error: any) {
    console.error('Error creating notice:', error)
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to create notice',
    })
  }
}

// Update a notice (notice_manager only)
export async function updateNotice(req: AuthedRequest, res: Response) {
  try {
    if (!req.user || !isNoticeManager(req)) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized. Only notice managers can update notices.',
      })
    }

    const noticeId = Number(req.params.id)
    if (!noticeId || Number.isNaN(noticeId)) {
      return res
        .status(400)
        .json({ success: false, message: 'Invalid notice ID' })
    }

    const body = req.body ?? {}
    const {
      title,
      category: rawCategory,
      section: rawSection,
      level: rawLevel,
      subsection,
      attachmentUrl,
      publishedDate,
      sourceUrl,
      externalRef,
    } = body

    const updateData: Partial<NewNotice> = {}
    if (title) updateData.title = title

    const category = normalizeCategoryInput(rawCategory, rawSection)
    if (category) updateData.category = category

    if (rawLevel !== undefined || subsection !== undefined) {
      const normalizedLevel =
        (rawLevel as string | null | undefined)?.trim() ||
        (subsection as string | null | undefined)?.trim() ||
        null
      updateData.level = normalizedLevel
    }
    if (attachmentUrl !== undefined) updateData.attachmentUrl = attachmentUrl
    if (publishedDate !== undefined) updateData.publishedDate = publishedDate
    if (sourceUrl !== undefined) updateData.sourceUrl = sourceUrl
    if (externalRef !== undefined) updateData.externalRef = externalRef

    const [updated] = await db
      .update(notice)
      .set(updateData)
      .where(eq(notice.id, noticeId))
      .returning()

    if (!updated) {
      return res
        .status(404)
        .json({ success: false, message: 'Notice not found' })
    }

    const effectiveCategory = (updated.category as NoticeCategory) || 'general'
    const effectiveLevel =
      updated.level || makeLegacySubsection(effectiveCategory)

    await Promise.allSettled([
      createInAppNotificationForAudience({
        audience: 'all',
        type: 'notice_updated',
        title: 'Notice Updated',
        body: updated.title,
        data: {
          noticeId: updated.id,
          noticeTitle: updated.title,
          category: effectiveCategory,
          section: toLegacySection(effectiveCategory),
          level: effectiveLevel,
          subsection: effectiveLevel,
          publisherId: req.user.id,
          iconKey: 'notice',
          ...(isImageUrl(updated.attachmentUrl)
            ? { thumbnailUrl: updated.attachmentUrl as string }
            : {}),
        },
      }).catch((error) =>
        console.error('Failed to create notice update notification:', error),
      ),

      sendToTopic('announcements', {
        title: 'Notice Updated',
        body: updated.title,
        data: {
          noticeId: updated.id.toString(),
          type: 'notice_updated',
          category: effectiveCategory,
          section: toLegacySection(effectiveCategory),
          level: effectiveLevel,
          subsection: effectiveLevel,
          publisherId: req.user.id,
          iconKey: 'notice',
        },
      }).catch((error) =>
        console.error(
          'Failed to send notice update FCM topic notification:',
          error,
        ),
      ),
    ])

    return res.json({
      success: true,
      message: 'Notice updated successfully',
      data: updated,
    })
  } catch (error: any) {
    console.error('Error updating notice:', error)
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to update notice',
    })
  }
}

// Upload notice attachment (notice_manager only)
export async function uploadNoticeAttachment(
  req: AuthedRequest,
  res: Response,
) {
  try {
    if (!req.user || !isNoticeManager(req)) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized. Only notice managers can upload attachments.',
      })
    }

    const file = (req as any).file as Express.Multer.File | undefined
    if (!file) {
      return res.status(400).json({
        success: false,
        message: 'Attachment file is required',
      })
    }

    if (!NOTICE_ATTACHMENTS.ALLOWED_TYPES.includes(file.mimetype as any)) {
      return res.status(400).json({
        success: false,
        message: 'Only images or PDF files are allowed',
      })
    }

    if (file.size > NOTICE_ATTACHMENTS.MAX_FILE_SIZE) {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum size is 10MB',
      })
    }

    const base64 = file.buffer.toString('base64')
    const dataUri = `data:${file.mimetype};base64,${base64}`

    const publicId = generatePublicId('notice', req.user.id)
    const cloudinaryResourceType = 'image'

    const uploadResult = await uploadAssignmentFileToCloudinary(
      dataUri,
      FOLDERS.NOTICE_ATTACHMENTS,
      publicId,
      cloudinaryResourceType,
    )

    if (!uploadResult.success || !uploadResult.data) {
      return res.status(400).json({
        success: false,
        message: uploadResult.message || 'Upload failed',
      })
    }

    return res.json({
      success: true,
      data: {
        url: uploadResult.data.url,
        name: file.originalname,
      },
    })
  } catch (error: any) {
    console.error('Error uploading notice attachment:', error)
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to upload file',
    })
  }
}

// Delete a notice (notice_manager only)
export async function deleteNotice(req: AuthedRequest, res: Response) {
  try {
    if (!req.user || !isNoticeManager(req)) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized. Only notice managers can delete notices.',
      })
    }

    const noticeId = Number(req.params.id)
    if (!noticeId || Number.isNaN(noticeId)) {
      return res
        .status(400)
        .json({ success: false, message: 'Invalid notice ID' })
    }

    const [deleted] = await db
      .delete(notice)
      .where(eq(notice.id, noticeId))
      .returning()

    if (!deleted) {
      return res
        .status(404)
        .json({ success: false, message: 'Notice not found' })
    }

    await deleteNoticeNotificationsByNoticeId({
      noticeId: deleted.id,
      types: ['notice_created', 'notice_updated'],
    })

    const effectiveCategory = (deleted.category as NoticeCategory) || 'general'
    const effectiveLevel =
      deleted.level || makeLegacySubsection(effectiveCategory)

    await createInAppNotificationForAudience({
      audience: 'admins',
      type: 'notice_deleted',
      title: 'Notice Removed',
      body: deleted.title,
      data: {
        noticeId: deleted.id,
        noticeTitle: deleted.title,
        category: effectiveCategory,
        section: toLegacySection(effectiveCategory),
        level: effectiveLevel,
        subsection: effectiveLevel,
        publisherId: req.user.id,
        iconKey: 'notice',
        ...(isImageUrl(deleted.attachmentUrl)
          ? { thumbnailUrl: deleted.attachmentUrl as string }
          : {}),
      },
    }).catch((error) =>
      console.error('Failed to create notice delete notification:', error),
    )

    return res.json({
      success: true,
      message: 'Notice deleted successfully',
    })
  } catch (error: any) {
    console.error('Error deleting notice:', error)
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete notice',
    })
  }
}

// Sync notices from IOE exam notice pages (for GitHub Actions/cron)
export async function syncIoeExamNotices(req: Request, res: Response) {
  try {
    const result = await syncExamNotices()

    return res.json({
      success: true,
      message: 'Notice sync completed successfully',
      data: result,
    })
  } catch (error: any) {
    console.error('Error syncing notices:', error)
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to sync notices',
    })
  }
}
