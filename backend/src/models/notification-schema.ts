import { relations } from "drizzle-orm";
import {
  pgTable,
  serial,
  text,
  timestamp,
  jsonb,
  pgEnum,
  uniqueIndex,
  index,
  integer,
} from "drizzle-orm/pg-core";
import { user } from "./auth-schema.js";

export const notificationAudienceEnum = pgEnum("notification_audience", [
  "direct",
  "all",
  "students",
  "teachers",
  "admins",
]);

export const notifications = pgTable(
  "notifications",
  {
    id: serial("id").primaryKey(),
    type: text("type").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    data: jsonb("data").$type<Record<string, string | number | boolean | null>>(),
    recipientId: text("recipient_id").references(() => user.id, {
      onDelete: "cascade",
    }),
    audience: notificationAudienceEnum("audience").default("direct").notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => [
    index("notifications_recipient_created_idx").on(
      table.recipientId,
      table.createdAt,
    ),
    index("notifications_audience_created_idx").on(
      table.audience,
      table.createdAt,
    ),
    index("notifications_type_created_idx").on(table.type, table.createdAt),
  ],
);

export const notificationReads = pgTable(
  "notification_reads",
  {
    id: serial("id").primaryKey(),
    notificationId: integer("notification_id")
      .notNull()
      .references(() => notifications.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    readAt: timestamp("read_at", { mode: "date" }).defaultNow().notNull(),
    deletedAt: timestamp("deleted_at", { mode: "date" }),
  },
  (table) => [
    uniqueIndex("notification_reads_unique_idx").on(
      table.notificationId,
      table.userId,
    ),
    index("notification_reads_user_read_idx").on(table.userId, table.readAt),
  ],
);

export const notificationsRelations = relations(notifications, ({ one, many }) => ({
  recipient: one(user, {
    fields: [notifications.recipientId],
    references: [user.id],
  }),
  reads: many(notificationReads),
}));

export const notificationReadsRelations = relations(notificationReads, ({ one }) => ({
  notification: one(notifications, {
    fields: [notificationReads.notificationId],
    references: [notifications.id],
  }),
  user: one(user, {
    fields: [notificationReads.userId],
    references: [user.id],
  }),
}));
