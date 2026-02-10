import { and, desc, eq, inArray, or, sql } from "drizzle-orm";
import { db } from "../lib/db.js";
import { bookListings, bookPurchaseRequests } from "../models/book_buy_sell-schema.js";
import {
  marketplaceReports,
  sellerRatings,
  userBlocks,
} from "../models/trust-schema.js";
import { sendToUser } from "./notification.service.js";

const REPORT_CATEGORIES = [
  "spam",
  "fraud",
  "abusive",
  "fake_listing",
  "suspicious_payment",
  "other",
] as const;

const REPORT_STATUSES = ["open", "in_review", "resolved", "rejected"] as const;

export type ReportCategory = (typeof REPORT_CATEGORIES)[number];
export type ReportStatus = (typeof REPORT_STATUSES)[number];

export async function getBlockedUserIds(userId: string) {
  const rows = await db.query.userBlocks.findMany({
    where: or(eq(userBlocks.blockerId, userId), eq(userBlocks.blockedUserId, userId)),
    columns: {
      blockerId: true,
      blockedUserId: true,
    },
  });

  const ids = new Set<string>();
  for (const row of rows) {
    if (row.blockerId === userId) ids.add(row.blockedUserId);
    if (row.blockedUserId === userId) ids.add(row.blockerId);
  }

  return [...ids];
}

export async function isUserBlockedBetween(userId: string, otherUserId: string) {
  const relation = await db.query.userBlocks.findFirst({
    where: or(
      and(eq(userBlocks.blockerId, userId), eq(userBlocks.blockedUserId, otherUserId)),
      and(eq(userBlocks.blockerId, otherUserId), eq(userBlocks.blockedUserId, userId)),
    ),
    columns: { id: true },
  });

  return Boolean(relation);
}

export async function blockUser(
  blockerId: string,
  blockedUserId: string,
  reason?: string,
): Promise<{ success: boolean; message: string }> {
  if (blockerId === blockedUserId) {
    return { success: false, message: "You cannot block yourself." };
  }

  const existing = await db.query.userBlocks.findFirst({
    where: and(
      eq(userBlocks.blockerId, blockerId),
      eq(userBlocks.blockedUserId, blockedUserId),
    ),
    columns: { id: true },
  });

  if (existing) {
    return { success: true, message: "User already blocked." };
  }

  await db.insert(userBlocks).values({
    blockerId,
    blockedUserId,
    reason,
  });

  return { success: true, message: "User blocked successfully." };
}

export async function unblockUser(
  blockerId: string,
  blockedUserId: string,
): Promise<{ success: boolean; message: string }> {
  await db
    .delete(userBlocks)
    .where(and(eq(userBlocks.blockerId, blockerId), eq(userBlocks.blockedUserId, blockedUserId)));

  return { success: true, message: "User unblocked successfully." };
}

export async function listBlockedUsers(blockerId: string) {
  const rows = await db.query.userBlocks.findMany({
    where: eq(userBlocks.blockerId, blockerId),
    orderBy: [desc(userBlocks.createdAt)],
    with: {
      blockedUser: {
        columns: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
    },
  });

  return {
    success: true,
    data: rows,
  };
}

export async function getSellerReputation(sellerId: string) {
  const [aggregate] = await db
    .select({
      averageRating: sql<number>`coalesce(avg(${sellerRatings.rating})::numeric, 0)`,
      totalRatings: sql<number>`count(*)::int`,
    })
    .from(sellerRatings)
    .where(eq(sellerRatings.sellerId, sellerId));

  const distributionRows = await db
    .select({
      rating: sellerRatings.rating,
      count: sql<number>`count(*)::int`,
    })
    .from(sellerRatings)
    .where(eq(sellerRatings.sellerId, sellerId))
    .groupBy(sellerRatings.rating);

  const distribution: Record<number, number> = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
  };

  for (const row of distributionRows) {
    distribution[row.rating] = row.count;
  }

  const [soldAggregate] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(bookListings)
    .where(and(eq(bookListings.sellerId, sellerId), eq(bookListings.status, "sold")));

  const recentRatings = await db.query.sellerRatings.findMany({
    where: eq(sellerRatings.sellerId, sellerId),
    orderBy: [desc(sellerRatings.createdAt)],
    limit: 10,
    with: {
      rater: {
        columns: {
          id: true,
          name: true,
          image: true,
        },
      },
      listing: {
        columns: {
          id: true,
          title: true,
        },
      },
    },
  });

  const average = Number(aggregate?.averageRating ?? 0);

  return {
    success: true,
    data: {
      averageRating: Number.isFinite(average) ? Number(average.toFixed(1)) : 0,
      totalRatings: aggregate?.totalRatings ?? 0,
      soldCount: soldAggregate?.count ?? 0,
      distribution,
      recentRatings,
    },
  };
}

export async function rateSeller(input: {
  sellerId: string;
  raterId: string;
  listingId: number;
  rating: number;
  review?: string;
}) {
  const { sellerId, raterId, listingId, rating, review } = input;

  if (sellerId === raterId) {
    return { success: false, message: "You cannot rate yourself." };
  }

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { success: false, message: "Rating must be an integer between 1 and 5." };
  }

  const blocked = await isUserBlockedBetween(sellerId, raterId);
  if (blocked) {
    return {
      success: false,
      message: "Rating is disabled while block rules are active between users.",
    };
  }

  const listing = await db.query.bookListings.findFirst({
    where: eq(bookListings.id, listingId),
    columns: {
      id: true,
      sellerId: true,
    },
  });

  if (!listing || listing.sellerId !== sellerId) {
    return {
      success: false,
      message: "This listing does not belong to the specified seller.",
    };
  }

  const interaction = await db.query.bookPurchaseRequests.findFirst({
    where: and(
      eq(bookPurchaseRequests.listingId, listingId),
      eq(bookPurchaseRequests.buyerId, raterId),
      inArray(bookPurchaseRequests.status, ["accepted", "completed"]),
    ),
    columns: { id: true },
  });

  if (!interaction) {
    return {
      success: false,
      message: "You can rate sellers only after a request is accepted.",
    };
  }

  const [savedRating] = await db
    .insert(sellerRatings)
    .values({
      sellerId,
      raterId,
      listingId,
      rating,
      review: review?.trim() || null,
    })
    .onConflictDoUpdate({
      target: [sellerRatings.sellerId, sellerRatings.raterId, sellerRatings.listingId],
      set: {
        rating,
        review: review?.trim() || null,
        updatedAt: new Date(),
      },
    })
    .returning();

  return {
    success: true,
    data: savedRating,
    message: "Seller rating submitted successfully.",
  };
}

export async function createMarketplaceReport(input: {
  reporterId: string;
  reportedUserId: string;
  listingId?: number;
  category: ReportCategory;
  description: string;
}) {
  const { reporterId, reportedUserId, listingId, category, description } = input;

  if (reporterId === reportedUserId) {
    return { success: false, message: "You cannot report yourself." };
  }

  if (!REPORT_CATEGORIES.includes(category)) {
    return { success: false, message: "Invalid report category." };
  }

  if (!description.trim()) {
    return { success: false, message: "Please provide a report description." };
  }

  if (listingId) {
    const listing = await db.query.bookListings.findFirst({
      where: eq(bookListings.id, listingId),
      columns: { id: true },
    });

    if (!listing) {
      return { success: false, message: "Listing not found." };
    }
  }

  const [report] = await db
    .insert(marketplaceReports)
    .values({
      reporterId,
      reportedUserId,
      listingId: listingId ?? null,
      category,
      description: description.trim(),
      status: "open",
    })
    .returning();

  return {
    success: true,
    data: report,
    message: "Report submitted. Our moderators will review it.",
  };
}

export async function listMyMarketplaceReports(reporterId: string) {
  const reports = await db.query.marketplaceReports.findMany({
    where: eq(marketplaceReports.reporterId, reporterId),
    orderBy: [desc(marketplaceReports.createdAt)],
    with: {
      reportedUser: {
        columns: {
          id: true,
          name: true,
          email: true,
        },
      },
      listing: {
        columns: {
          id: true,
          title: true,
        },
      },
      reviewer: {
        columns: {
          id: true,
          name: true,
        },
      },
    },
  });

  return {
    success: true,
    data: reports,
  };
}

export async function listModerationReports(status?: ReportStatus) {
  const where = status ? eq(marketplaceReports.status, status) : undefined;

  const reports = await db.query.marketplaceReports.findMany({
    where,
    orderBy: [desc(marketplaceReports.createdAt)],
    with: {
      reporter: {
        columns: {
          id: true,
          name: true,
          email: true,
        },
      },
      reportedUser: {
        columns: {
          id: true,
          name: true,
          email: true,
        },
      },
      listing: {
        columns: {
          id: true,
          title: true,
        },
      },
      reviewer: {
        columns: {
          id: true,
          name: true,
        },
      },
    },
  });

  return {
    success: true,
    data: reports,
  };
}

export async function reviewMarketplaceReport(input: {
  reportId: number;
  reviewerId: string;
  status: ReportStatus;
  resolutionNotes?: string;
}) {
  const { reportId, reviewerId, status, resolutionNotes } = input;

  if (!REPORT_STATUSES.includes(status)) {
    return { success: false, message: "Invalid report status." };
  }

  const [updated] = await db
    .update(marketplaceReports)
    .set({
      status,
      resolutionNotes: resolutionNotes?.trim() || null,
      reviewedBy: reviewerId,
      reviewedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(marketplaceReports.id, reportId))
    .returning();

  if (!updated) {
    return { success: false, message: "Report not found." };
  }

  sendToUser(updated.reporterId, {
    title: "Moderation update",
    body: `Your marketplace report is now marked as ${status.replace("_", " ")}.`,
    data: {
      type: "admin_moderation_update",
      reportId: updated.id.toString(),
      status,
      iconKey: "general",
    },
  }).catch((error) =>
    console.error("Failed to notify reporter about moderation update:", error),
  );

  return {
    success: true,
    data: updated,
    message: "Report updated successfully.",
  };
}

export async function getTrustStats() {
  const [openReports] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(marketplaceReports)
    .where(inArray(marketplaceReports.status, ["open", "in_review"]));

  const [ratings] = await db
    .select({
      count: sql<number>`count(*)::int`,
      average: sql<number>`coalesce(avg(${sellerRatings.rating})::numeric, 0)`,
    })
    .from(sellerRatings);

  const [blocks] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(userBlocks);

  return {
    success: true,
    data: {
      openReports: openReports?.count ?? 0,
      ratingsCount: ratings?.count ?? 0,
      averageRating: Number(Number(ratings?.average ?? 0).toFixed(1)),
      activeBlocks: blocks?.count ?? 0,
    },
  };
}

