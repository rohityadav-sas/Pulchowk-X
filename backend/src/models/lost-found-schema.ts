import { relations } from "drizzle-orm";
import {
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  index,
  varchar,
} from "drizzle-orm/pg-core";
import { user } from "./auth-schema.js";

export const lostFoundItemTypeEnum = pgEnum("lost_found_item_type", [
  "lost",
  "found",
]);

export const lostFoundCategoryEnum = pgEnum("lost_found_category", [
  "documents",
  "electronics",
  "accessories",
  "ids_cards",
  "keys",
  "bags",
  "other",
]);

export const lostFoundStatusEnum = pgEnum("lost_found_status", [
  "open",
  "claimed",
  "resolved",
  "closed",
]);

export const lostFoundClaimStatusEnum = pgEnum("lost_found_claim_status", [
  "pending",
  "accepted",
  "rejected",
  "cancelled",
]);

export const lostFoundItems = pgTable(
  "lost_found_items",
  {
    id: serial("id").primaryKey(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    itemType: lostFoundItemTypeEnum("item_type").notNull(),
    title: varchar("title", { length: 180 }).notNull(),
    description: text("description").notNull(),
    category: lostFoundCategoryEnum("category").notNull(),
    lostFoundDate: timestamp("lost_found_date", { mode: "date" }).notNull(),
    locationText: varchar("location_text", { length: 220 }).notNull(),
    contactNote: varchar("contact_note", { length: 220 }),
    status: lostFoundStatusEnum("status").default("open").notNull(),
    rewardText: varchar("reward_text", { length: 120 }),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("lost_found_items_type_status_created_idx").on(
      table.itemType,
      table.status,
      table.createdAt,
    ),
    index("lost_found_items_category_created_idx").on(
      table.category,
      table.createdAt,
    ),
    index("lost_found_items_owner_created_idx").on(table.ownerId, table.createdAt),
  ],
);

export const lostFoundImages = pgTable(
  "lost_found_images",
  {
    id: serial("id").primaryKey(),
    itemId: integer("item_id")
      .notNull()
      .references(() => lostFoundItems.id, { onDelete: "cascade" }),
    imageUrl: text("image_url").notNull(),
    cloudinaryPublicId: text("cloudinary_public_id"),
    sortOrder: integer("sort_order").default(0).notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => [index("lost_found_images_item_sort_idx").on(table.itemId, table.sortOrder)],
);

export const lostFoundClaims = pgTable(
  "lost_found_claims",
  {
    id: serial("id").primaryKey(),
    itemId: integer("item_id")
      .notNull()
      .references(() => lostFoundItems.id, { onDelete: "cascade" }),
    requesterId: text("requester_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    message: text("message").notNull(),
    status: lostFoundClaimStatusEnum("status").default("pending").notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("lost_found_claims_item_requester_unique_idx").on(
      table.itemId,
      table.requesterId,
    ),
    index("lost_found_claims_item_status_idx").on(table.itemId, table.status),
    index("lost_found_claims_requester_created_idx").on(
      table.requesterId,
      table.createdAt,
    ),
  ],
);

export const lostFoundItemsRelations = relations(lostFoundItems, ({ one, many }) => ({
  owner: one(user, {
    fields: [lostFoundItems.ownerId],
    references: [user.id],
  }),
  images: many(lostFoundImages),
  claims: many(lostFoundClaims),
}));

export const lostFoundImagesRelations = relations(lostFoundImages, ({ one }) => ({
  item: one(lostFoundItems, {
    fields: [lostFoundImages.itemId],
    references: [lostFoundItems.id],
  }),
}));

export const lostFoundClaimsRelations = relations(lostFoundClaims, ({ one }) => ({
  item: one(lostFoundItems, {
    fields: [lostFoundClaims.itemId],
    references: [lostFoundItems.id],
  }),
  requester: one(user, {
    fields: [lostFoundClaims.requesterId],
    references: [user.id],
  }),
}));

export type LostFoundItem = typeof lostFoundItems.$inferSelect;
export type NewLostFoundItem = typeof lostFoundItems.$inferInsert;
export type LostFoundImage = typeof lostFoundImages.$inferSelect;
export type NewLostFoundImage = typeof lostFoundImages.$inferInsert;
export type LostFoundClaim = typeof lostFoundClaims.$inferSelect;
export type NewLostFoundClaim = typeof lostFoundClaims.$inferInsert;
