import { relations } from "drizzle-orm";
import {
  pgTable,
  serial,
  text,
  timestamp,
  integer,
  varchar,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { user } from "./auth-schema.js";
import { bookListings } from "./book_buy_sell-schema.js";

export const sellerRatings = pgTable(
  "seller_ratings",
  {
    id: serial("id").primaryKey(),
    sellerId: text("seller_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    raterId: text("rater_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    listingId: integer("listing_id")
      .notNull()
      .references(() => bookListings.id, { onDelete: "cascade" }),
    rating: integer("rating").notNull(),
    review: text("review"),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("seller_ratings_unique_idx").on(
      table.sellerId,
      table.raterId,
      table.listingId,
    ),
    index("seller_ratings_seller_idx").on(table.sellerId),
    index("seller_ratings_rater_idx").on(table.raterId),
    index("seller_ratings_listing_idx").on(table.listingId),
  ],
);

export const userBlocks = pgTable(
  "user_blocks",
  {
    id: serial("id").primaryKey(),
    blockerId: text("blocker_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    blockedUserId: text("blocked_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    reason: text("reason"),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("user_blocks_unique_idx").on(table.blockerId, table.blockedUserId),
    index("user_blocks_blocker_idx").on(table.blockerId),
    index("user_blocks_blocked_idx").on(table.blockedUserId),
  ],
);

export const marketplaceReports = pgTable(
  "marketplace_reports",
  {
    id: serial("id").primaryKey(),
    reporterId: text("reporter_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    reportedUserId: text("reported_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    listingId: integer("listing_id").references(() => bookListings.id, {
      onDelete: "set null",
    }),
    category: varchar("category", { length: 50 }).notNull(),
    description: text("description").notNull(),
    status: varchar("status", { length: 20 }).default("open").notNull(),
    resolutionNotes: text("resolution_notes"),
    reviewedBy: text("reviewed_by").references(() => user.id, {
      onDelete: "set null",
    }),
    reviewedAt: timestamp("reviewed_at", { mode: "date" }),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("marketplace_reports_status_idx").on(table.status),
    index("marketplace_reports_reporter_idx").on(table.reporterId),
    index("marketplace_reports_reported_idx").on(table.reportedUserId),
    index("marketplace_reports_listing_idx").on(table.listingId),
  ],
);

export const sellerRatingsRelations = relations(sellerRatings, ({ one }) => ({
  seller: one(user, {
    fields: [sellerRatings.sellerId],
    references: [user.id],
    relationName: "seller_ratings_as_seller",
  }),
  rater: one(user, {
    fields: [sellerRatings.raterId],
    references: [user.id],
    relationName: "seller_ratings_as_rater",
  }),
  listing: one(bookListings, {
    fields: [sellerRatings.listingId],
    references: [bookListings.id],
  }),
}));

export const userBlocksRelations = relations(userBlocks, ({ one }) => ({
  blocker: one(user, {
    fields: [userBlocks.blockerId],
    references: [user.id],
    relationName: "user_blocks_as_blocker",
  }),
  blockedUser: one(user, {
    fields: [userBlocks.blockedUserId],
    references: [user.id],
    relationName: "user_blocks_as_blocked",
  }),
}));

export const marketplaceReportsRelations = relations(
  marketplaceReports,
  ({ one }) => ({
    reporter: one(user, {
      fields: [marketplaceReports.reporterId],
      references: [user.id],
      relationName: "marketplace_reports_as_reporter",
    }),
    reportedUser: one(user, {
      fields: [marketplaceReports.reportedUserId],
      references: [user.id],
      relationName: "marketplace_reports_as_reported",
    }),
    reviewer: one(user, {
      fields: [marketplaceReports.reviewedBy],
      references: [user.id],
      relationName: "marketplace_reports_as_reviewer",
    }),
    listing: one(bookListings, {
      fields: [marketplaceReports.listingId],
      references: [bookListings.id],
    }),
  }),
);

export type SellerRating = typeof sellerRatings.$inferSelect;
export type NewSellerRating = typeof sellerRatings.$inferInsert;
export type UserBlock = typeof userBlocks.$inferSelect;
export type NewUserBlock = typeof userBlocks.$inferInsert;
export type MarketplaceReport = typeof marketplaceReports.$inferSelect;
export type NewMarketplaceReport = typeof marketplaceReports.$inferInsert;

