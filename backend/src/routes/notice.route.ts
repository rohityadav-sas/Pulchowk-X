import express from 'express'
import multer from 'multer'
import {
  createNotice,
  deleteNotice,
  getNotices,
  getNoticeStats,
  syncIoeExamNotices,
  uploadNoticeAttachment,
  updateNotice,
  getNotice,
} from '../controllers/notice.controller.js'
import { requireAuth } from '../middleware/auth.middleware.js'

const router = express.Router()
const upload = multer({ storage: multer.memoryStorage() })

// Public routes - anyone can view notices
router.get('/', getNotices)
router.get('/stats', getNoticeStats)
router.get('/sync/ioe', syncIoeExamNotices)
router.get('/:id', getNotice)

// Protected routes - require authentication
router.post(
  '/upload',
  requireAuth,
  upload.single('file'),
  uploadNoticeAttachment,
)
router.post('/', requireAuth, createNotice)
router.put('/:id', requireAuth, updateNotice)
router.delete('/:id', requireAuth, deleteNotice)

export default router
