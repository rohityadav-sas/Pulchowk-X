import { Request, Response } from "express";
import {
  getUnreadNotificationCount,
  listInAppNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "../services/inAppNotification.service.js";

function getAuth(req: Request) {
  const user = (req as any).user as { id: string; role?: string } | undefined;
  return { userId: user?.id, role: user?.role };
}

export async function GetNotifications(req: Request, res: Response) {
  const { userId, role } = getAuth(req);
  if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

  const parsedLimit = Number(req.query.limit);
  const parsedOffset = Number(req.query.offset);
  const type = (req.query.type as string | undefined)?.trim();
  const unreadOnly = req.query.unreadOnly === "true";

  const result = await listInAppNotifications(userId, role, {
    limit: Number.isFinite(parsedLimit) ? parsedLimit : undefined,
    offset: Number.isFinite(parsedOffset) ? parsedOffset : undefined,
    type,
    unreadOnly,
  });

  return res.json(result);
}

export async function GetUnreadCount(req: Request, res: Response) {
  const { userId, role } = getAuth(req);
  if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

  const result = await getUnreadNotificationCount(userId, role);
  return res.json(result);
}

export async function MarkNotificationRead(req: Request, res: Response) {
  const { userId, role } = getAuth(req);
  if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

  const notificationId = Number(req.params.id);
  if (!Number.isInteger(notificationId) || notificationId <= 0) {
    return res.status(400).json({ success: false, message: "Invalid notification id." });
  }

  const result = await markNotificationAsRead(notificationId, userId, role);
  if (!result.success) return res.status(404).json(result);
  return res.json(result);
}

export async function MarkAllNotificationsRead(req: Request, res: Response) {
  const { userId, role } = getAuth(req);
  if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

  const result = await markAllNotificationsAsRead(userId, role);
  return res.json(result);
}

