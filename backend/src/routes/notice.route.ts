import express from "express";
import multer from "multer";
import {
  createNotice,
  deleteNotice,
  getNotices,
  getNoticeStats,
  markNoticeAsRead,
  uploadNoticeAttachment,
  updateNotice,
} from "../controllers/notice.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Public routes - anyone can view notices
router.get("/", getNotices);
router.get("/stats", getNoticeStats);

// Protected routes - require authentication
router.post("/upload", requireAuth, upload.single("file"), uploadNoticeAttachment);
router.post("/", requireAuth, createNotice);
router.put("/:id", requireAuth, updateNotice);
router.delete("/:id", requireAuth, deleteNotice);

// Mark notice as read (any authenticated user)
router.patch("/:id/read", requireAuth, markNoticeAsRead);

export default router;
