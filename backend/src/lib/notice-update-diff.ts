export type NoticeComparable = {
  title?: string | null
  category?: string | null
  level?: string | null
  attachmentUrl?: string | null
  publishedDate?: string | null
  sourceUrl?: string | null
  externalRef?: string | null
}

export type NoticeChangeField =
  | 'title'
  | 'category'
  | 'level'
  | 'attachmentUrl'
  | 'publishedDate'
  | 'sourceUrl'
  | 'externalRef'

export type NoticeFieldChange = {
  field: NoticeChangeField
  label: string
  previous: string | null
  next: string | null
}

const TRACKED_FIELDS: NoticeChangeField[] = [
  'title',
  'category',
  'level',
  'attachmentUrl',
  'publishedDate',
  'sourceUrl',
  'externalRef',
]

const FIELD_LABEL: Record<NoticeChangeField, string> = {
  title: 'Title',
  category: 'Category',
  level: 'Level',
  attachmentUrl: 'Attachment URL',
  publishedDate: 'Published Date',
  sourceUrl: 'Source URL',
  externalRef: 'External Ref',
}

const EMPTY_VALUE_LABEL = '[empty]'

function normalizeValue(value: unknown): string | null {
  if (value === null || value === undefined) return null
  const normalized = String(value).replace(/\s+/g, ' ').trim()
  return normalized.length > 0 ? normalized : null
}

function toDisplayValue(value: string | null, maxLength = 72): string {
  const raw = value ?? EMPTY_VALUE_LABEL
  if (raw.length <= maxLength) return raw
  return `${raw.slice(0, Math.max(0, maxLength - 3)).trimEnd()}...`
}

function truncateSummary(value: string, maxLength: number): string {
  if (maxLength <= 0) return ''
  if (value.length <= maxLength) return value
  return `${value.slice(0, Math.max(0, maxLength - 3)).trimEnd()}...`
}

function formatChange(change: NoticeFieldChange): string {
  return `${change.label}: ${toDisplayValue(change.previous)} -> ${toDisplayValue(change.next)}`
}

export function computeNoticeFieldChanges(
  previous: NoticeComparable,
  next: NoticeComparable,
): NoticeFieldChange[] {
  const changes: NoticeFieldChange[] = []

  for (const field of TRACKED_FIELDS) {
    const previousValue = normalizeValue(previous[field])
    const nextValue = normalizeValue(next[field])
    if (previousValue === nextValue) continue

    changes.push({
      field,
      label: FIELD_LABEL[field],
      previous: previousValue,
      next: nextValue,
    })
  }

  return changes
}

export function buildNoticeChangeSummary(
  changes: NoticeFieldChange[],
  maxLength = 240,
): string {
  if (changes.length === 0) return ''
  const raw = changes.map((change) => formatChange(change)).join('; ')
  return truncateSummary(raw, maxLength)
}

export function buildNoticeUpdateNotificationTitle(
  changes: NoticeFieldChange[],
): string {
  if (changes.length === 0) return 'Notice Updated'
  const prefix = 'Notice Updated: '
  const summary = buildNoticeChangeSummary(changes, 220 - prefix.length)
  return summary ? `${prefix}${summary}` : 'Notice Updated'
}

export function buildNoticeChangeData(
  changes: NoticeFieldChange[],
): Record<string, string> {
  const data: Record<string, string> = {
    noticeChangeCount: String(changes.length),
    noticeChangedFields: changes.map((change) => change.field).join(','),
    noticeChangeSummary: buildNoticeChangeSummary(changes, 800),
  }

  for (let index = 0; index < Math.min(5, changes.length); index += 1) {
    const change = changes[index]
    const key = `noticeChange${index + 1}`
    data[`${key}Field`] = change.field
    data[`${key}Label`] = change.label
    data[`${key}Old`] = toDisplayValue(change.previous, 240)
    data[`${key}New`] = toDisplayValue(change.next, 240)
  }

  return data
}
