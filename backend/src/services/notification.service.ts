import admin from "firebase-admin";
import ENV from "../config/ENV.js";
import { db } from "../lib/db.js";
import { user } from "../models/auth-schema.js";
import { eq } from "drizzle-orm";
import fs from "fs";
import path from "path";
import {
  createInAppNotificationForAudience,
  createInAppNotificationForUser,
} from "./inAppNotification.service.js";

let isFirebaseInitialized = false;

function initializeFirebase() {
  try {
    if (admin.apps.length > 0) {
      isFirebaseInitialized = true;
      return;
    }

    let serviceAccount: any;

    if (ENV.FIREBASE_SERVICE_ACCOUNT_JSON) {
      serviceAccount = JSON.parse(ENV.FIREBASE_SERVICE_ACCOUNT_JSON);
      console.log("Firebase initializing from environment variable.");
    } else if (ENV.FIREBASE_SERVICE_ACCOUNT_PATH) {
      const keyPath = ENV.FIREBASE_SERVICE_ACCOUNT_PATH;
      const absolutePath = path.isAbsolute(keyPath)
        ? keyPath
        : path.join(process.cwd(), keyPath);

      if (fs.existsSync(absolutePath)) {
        serviceAccount = JSON.parse(fs.readFileSync(absolutePath, "utf8"));
        console.log(`Firebase initializing from file: ${absolutePath}`);
      }
    }

    if (!serviceAccount) {
      console.warn(
        "No Firebase credentials found (JSON or Path). Automated notifications disabled.",
      );
      return;
    }

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

    isFirebaseInitialized = true;
    console.log("Firebase Admin SDK initialized successfully.");
  } catch (error) {
    console.error("Failed to initialize Firebase Admin SDK:", error);
  }
}

// Initialize on load
initializeFirebase();

interface NotificationPayload {
  title?: string;
  body?: string;
  data?: Record<string, string>;
}

export const sendToTopic = async (
  topic: string,
  payload: NotificationPayload,
) => {
  const derivedTitle =
    payload.title || (typeof payload.data?.title === "string" ? payload.data.title : undefined);
  const derivedBody =
    payload.body || (typeof payload.data?.body === "string" ? payload.data.body : undefined);

  if (derivedTitle && derivedBody) {
    if (topic === "events") {
      createInAppNotificationForAudience({
        audience: "all",
        type: "event_published",
        title: derivedTitle,
        body: derivedBody,
        data: { iconKey: "event", ...payload.data },
      }).catch((error) =>
        console.error("Failed to create in-app audience notification:", error),
      );
    }

    if (topic === "books") {
      createInAppNotificationForAudience({
        audience: "all",
        type: "book_listed",
        title: derivedTitle,
        body: derivedBody,
        data: { iconKey: "book", ...payload.data },
      }).catch((error) =>
        console.error("Failed to create in-app audience notification:", error),
      );
    }
  }

  if (!isFirebaseInitialized) {
    console.warn("Cannot send notification: Firebase not initialized.");
    return;
  }

  const message: any = {
    data: {
      ...payload.data,
      click_action: "FLUTTER_NOTIFICATION_CLICK",
    },
    topic: topic,
  };

  if (payload.title && payload.body) {
    message.notification = {
      title: payload.title,
      body: payload.body,
    };
  } else {
    // If it's a data-only message, ensure title and body are in data
    // so the client can display them manually if needed
    if (payload.title) message.data.title = payload.title;
    if (payload.body) message.data.body = payload.body;
  }

  try {
    const response = await admin.messaging().send(message);
    console.log(`Successfully sent notification to topic ${topic}:`, response);
    return response;
  } catch (error) {
    console.error(`Error sending notification to topic ${topic}:`, error);
  }
};

export const sendToUser = async (
  userId: string,
  payload: NotificationPayload,
) => {
  if (payload.title && payload.body) {
    createInAppNotificationForUser({
      userId,
      type: payload.data?.type || "user_notification",
      title: payload.title,
      body: payload.body,
      data: payload.data,
    }).catch((error) =>
      console.error("Failed to create in-app user notification:", error),
    );
  }

  if (!isFirebaseInitialized) {
    console.warn("Cannot send notification: Firebase not initialized.");
    return;
  }

  try {
    // Fetch user's FCM token from DB
    const userData = await db.query.user.findFirst({
      where: eq(user.id, userId),
      columns: { fcmToken: true },
    });

    if (!userData?.fcmToken) {
      console.warn(
        `Cannot send notification: No FCM token found for user ${userId}`,
      );
      return;
    }

    const message = {
      notification: {
        title: payload.title,
        body: payload.body,
      },
      data: {
        ...payload.data,
        click_action: "FLUTTER_NOTIFICATION_CLICK",
      },
      token: userData.fcmToken,
    };

    const response = await admin.messaging().send(message);
    console.log(`Successfully sent notification to user ${userId}:`, response);
    return response;
  } catch (error) {
    console.error(`Error sending notification to user ${userId}:`, error);
  }
};

/**
 * @deprecated Use sendToTopic or sendToUser instead
 */
export const sendEventNotification = async (event: any) => {
  const creatorId =
    typeof event?.creatorId === "string" && event.creatorId.trim().length > 0
      ? event.creatorId
      : undefined;
  return sendToTopic("events", {
    title: "New Event Published!",
    body: `${event.title} is now open for registration.`,
    data: {
      eventId: event.id.toString(),
      eventTitle: String(event.title),
      type: "new_event",
      iconKey: "event",
      ...(creatorId ? { publisherId: creatorId } : {}),
      ...(event.bannerUrl ? { bannerUrl: String(event.bannerUrl), thumbnailUrl: String(event.bannerUrl) } : {}),
    },
  });
};
