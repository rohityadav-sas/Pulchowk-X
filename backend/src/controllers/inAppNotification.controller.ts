import { Request, Response } from "express";
import {
  getUnreadNotificationCount,
  listInAppNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  getNotificationPreferencesForUser,
  updateNotificationPreferencesForUser,
  markNotificationDeleted,
} from "../services/inAppNotification.service.js";
import { type NotificationPreferences } from "../lib/notification-preferences.js";

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

export async function GetNotificationPreferences(req: Request, res: Response) {
  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

  const result = await getNotificationPreferencesForUser(userId);
  return res.json(result);
}

export async function UpdateNotificationPreferences(req: Request, res: Response) {
  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

  const body = (req.body ?? {}) as Partial<NotificationPreferences>;
  const patch: Partial<NotificationPreferences> = {};

  const keys: Array<keyof NotificationPreferences> = [
    "eventReminders",
    "marketplaceAlerts",
    "noticeUpdates",
    "classroomAlerts",
    "chatAlerts",
    "adminAlerts",
  ];

  for (const key of keys) {
    const value = body[key];
    if (value !== undefined && typeof value !== "boolean") {
      return res
        .status(400)
        .json({ success: false, message: `Invalid value for ${key}. Expected boolean.` });
    }
    if (typeof value === "boolean") {
      patch[key] = value;
    }
  }

  const result = await updateNotificationPreferencesForUser(userId, patch);
  return res.json(result);
}

export async function DeleteNotification(req: Request, res: Response) {
  const { userId, role } = getAuth(req);
  if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

  const notificationId = Number(req.params.id);
  if (!Number.isInteger(notificationId) || notificationId <= 0) {
    return res.status(400).json({ success: false, message: "Invalid notification id." });
  }

  const result = await markNotificationDeleted(notificationId, userId, role);
  if (!result.success) return res.status(404).json(result);
  return res.json(result);
}
