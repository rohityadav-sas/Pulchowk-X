import { db } from "../lib/db.js";
import { eq, and, desc, inArray } from "drizzle-orm";
import {
  bookPurchaseRequests,
  bookListings,
} from "../models/book_buy_sell-schema.js";
import { user } from "../models/auth-schema.js";
import { sendToUser } from "./notification.service.js";
import { unwrapOne } from "../lib/type-utils.js";
import { isUserBlockedBetween } from "./trust.service.js";

export const createPurchaseRequest = async (
  listingId: number,
  buyerId: string,
  message?: string,
) => {
  try {
    const listing = await db.query.bookListings.findFirst({
      where: eq(bookListings.id, listingId),
      with: {
        images: {
          limit: 1,
        },
      },
    });

    if (!listing) {
      return { success: false, message: "Listing not found." };
    }

    if (listing.sellerId === buyerId) {
      return {
        success: false,
        message: "You cannot request to buy your own book.",
      };
    }

    const blocked = await isUserBlockedBetween(buyerId, listing.sellerId);
    if (blocked) {
      return {
        success: false,
        message: "Request is blocked due to trust settings between users.",
      };
    }

    if (listing.status !== "available") {
      return { success: false, message: "This book is no longer available." };
    }

    const existing = await db.query.bookPurchaseRequests.findFirst({
      where: and(
        eq(bookPurchaseRequests.listingId, listingId),
        eq(bookPurchaseRequests.buyerId, buyerId),
      ),
    });

    if (existing) {
      return {
        success: false,
        message:
          existing.status === "rejected"
            ? "Your previous request was rejected."
            : "You have already requested this book.",
        existingStatus: existing.status,
      };
    }

    const [request] = await db
      .insert(bookPurchaseRequests)
      .values({
        listingId,
        buyerId,
        message,
      })
      .returning();

    const buyer = await db.query.user.findFirst({
      where: eq(user.id, buyerId),
      columns: {
        id: true,
        name: true,
        image: true,
      },
    });

    const buyerName = buyer?.name?.trim() || "Someone";

    // Notify seller (non-blocking but awaited for serverless safety)
    await sendToUser(listing.sellerId, {
      title: "New Purchase Request!",
      body: `${buyerName} is interested in your book: ${listing.title}.`,
      data: {
        type: "purchase_request",
        listingId: listingId.toString(),
        requestId: request.id.toString(),
        buyerId: buyerId.toString(),
        buyerName,
        actorName: buyerName,
        ...(buyer?.image ? { actorAvatarUrl: buyer.image } : {}),
        listingTitle: listing.title,
        iconKey: "book",
        ...(listing.images?.[0]?.imageUrl
          ? { thumbnailUrl: listing.images[0].imageUrl }
          : {}),
      },
    });

    return {
      success: true,
      data: request,
      message: "Request sent successfully!",
    };
  } catch (error) {
    console.error("Error creating purchase request:", error);
    return { success: false, message: "Failed to send request." };
  }
};

export const getPurchaseRequestsForListing = async (
  listingId: number,
  sellerId: string,
) => {
  try {
    const listing = await db.query.bookListings.findFirst({
      where: eq(bookListings.id, listingId),
    });

    if (!listing) {
      return { success: false, message: "Listing not found." };
    }

    if (listing.sellerId !== sellerId) {
      return {
        success: false,
        message: "You are not authorized to view these requests.",
      };
    }

    const requests = await db.query.bookPurchaseRequests.findMany({
      where: eq(bookPurchaseRequests.listingId, listingId),
      with: {
        buyer: {
          columns: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        listing: {
          with: {
            images: { limit: 1 },
            seller: {
              columns: {
                id: true,
                name: true,
                image: true,
              },
            },
          },
        },
      },
      orderBy: desc(bookPurchaseRequests.createdAt),
    });

    return { success: true, data: requests };
  } catch (error) {
    console.error("Error getting purchase requests:", error);
    return { success: false, message: "Failed to get requests." };
  }
};

export const getMyPurchaseRequests = async (buyerId: string) => {
  try {
    const requests = await db.query.bookPurchaseRequests.findMany({
      where: eq(bookPurchaseRequests.buyerId, buyerId),
      with: {
        listing: {
          with: {
            images: { limit: 1 },
            seller: {
              columns: {
                id: true,
                name: true,
                image: true,
              },
            },
          },
        },
      },
      orderBy: desc(bookPurchaseRequests.createdAt),
    });

    return { success: true, data: requests };
  } catch (error) {
    console.error("Error getting my purchase requests:", error);
    return { success: false, message: "Failed to get your requests." };
  }
};

export const getIncomingPurchaseRequests = async (sellerId: string) => {
  try {
    // Find all listings belonging to this seller
    const myListings = await db.query.bookListings.findMany({
      where: eq(bookListings.sellerId, sellerId),
      columns: { id: true },
    });

    const listingIds = myListings.map((l) => l.id);

    if (listingIds.length === 0) {
      return { success: true, data: [] };
    }

    // Find all requests for these listings
    const requests = await db.query.bookPurchaseRequests.findMany({
      where: inArray(bookPurchaseRequests.listingId, listingIds),
      with: {
        buyer: {
          columns: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        listing: {
          with: {
            images: { limit: 1 },
          },
        },
      },
      orderBy: desc(bookPurchaseRequests.createdAt),
    });

    return { success: true, data: requests };
  } catch (error) {
    console.error("Error getting incoming purchase requests:", error);
    return { success: false, message: "Failed to get incoming requests." };
  }
};

export const respondToPurchaseRequest = async (
  requestId: number,
  sellerId: string,
  accept: boolean,
) => {
  try {
    const request = await db.query.bookPurchaseRequests.findFirst({
      where: eq(bookPurchaseRequests.id, requestId),
      with: {
        listing: {
          with: {
            images: {
              limit: 1,
            },
          },
        },
      },
    });

    if (!request) {
      return { success: false, message: "Request not found." };
    }

    const requestListing = unwrapOne(request.listing);
    if (!requestListing) {
      return { success: false, message: "Listing not found." };
    }

    if (requestListing.sellerId !== sellerId) {
      return {
        success: false,
        message: "You are not authorized to respond to this request.",
      };
    }

    if (request.status !== "requested") {
      return {
        success: false,
        message: "This request has already been responded to.",
      };
    }

    const newStatus = accept ? "accepted" : "rejected";

    const [updated] = await db
      .update(bookPurchaseRequests)
      .set({
        status: newStatus,
        respondedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(bookPurchaseRequests.id, requestId))
      .returning();

    const seller = await db.query.user.findFirst({
      where: eq(user.id, sellerId),
      columns: {
        id: true,
        name: true,
        image: true,
      },
    });

    const sellerName = seller?.name?.trim() || "Seller";

    // Notify buyer (non-blocking but awaited)
    await sendToUser(request.buyerId, {
      title: accept ? "Request Accepted!" : "Request Rejected",
      body: accept
        ? `Your request for "${requestListing.title}" was accepted! You can now see the seller's contact info.`
        : `Your request for "${requestListing.title}" was rejected.`,
      data: {
        type: "request_response",
        listingId: request.listingId.toString(),
        requestId: request.id.toString(),
        sellerId: sellerId.toString(),
        actorName: sellerName,
        ...(seller?.image ? { actorAvatarUrl: seller.image } : {}),
        listingTitle: requestListing.title,
        status: newStatus,
        iconKey: "book",
        ...(requestListing.images?.[0]?.imageUrl
          ? { thumbnailUrl: requestListing.images[0].imageUrl }
          : {}),
      },
    });

    return {
      success: true,
      data: updated,
      message: accept
        ? "Request accepted! Buyer can now see your contact info."
        : "Request rejected.",
    };
  } catch (error) {
    console.error("Error responding to purchase request:", error);
    return { success: false, message: "Failed to respond to request." };
  }
};

export const getPurchaseRequestStatus = async (
  listingId: number,
  buyerId: string,
) => {
  try {
    const request = await db.query.bookPurchaseRequests.findFirst({
      where: and(
        eq(bookPurchaseRequests.listingId, listingId),
        eq(bookPurchaseRequests.buyerId, buyerId),
      ),
    });

    return { success: true, data: request || null };
  } catch (error) {
    console.error("Error getting purchase request status:", error);
    return { success: false, message: "Failed to get request status." };
  }
};

export const cancelPurchaseRequest = async (
  requestId: number,
  buyerId: string,
) => {
  try {
    const request = await db.query.bookPurchaseRequests.findFirst({
      where: eq(bookPurchaseRequests.id, requestId),
    });

    if (!request) {
      return { success: false, message: "Request not found." };
    }

    if (request.buyerId !== buyerId) {
      return {
        success: false,
        message: "You are not authorized to cancel this request.",
      };
    }

    if (request.status !== "requested") {
      return {
        success: false,
        message: "Only pending requests can be cancelled.",
      };
    }

    await db
      .delete(bookPurchaseRequests)
      .where(eq(bookPurchaseRequests.id, requestId));

    const listing = await db.query.bookListings.findFirst({
      where: eq(bookListings.id, request.listingId),
      with: { images: { limit: 1 } },
    });
    const buyer = await db.query.user.findFirst({
      where: eq(user.id, buyerId),
      columns: { name: true, image: true },
    });

    if (listing) {
      await sendToUser(listing.sellerId, {
        title: "Purchase request cancelled",
        body: `${buyer?.name || "A buyer"} cancelled a request for "${listing.title}".`,
        data: {
          type: "purchase_request_cancelled",
          requestId: requestId.toString(),
          listingId: listing.id.toString(),
          buyerId,
          actorName: buyer?.name || "Buyer",
          ...(buyer?.image ? { actorAvatarUrl: buyer.image } : {}),
          listingTitle: listing.title,
          iconKey: "book",
          ...(listing.images?.[0]?.imageUrl
            ? { thumbnailUrl: listing.images[0].imageUrl }
            : {}),
        },
      });
    }

    return { success: true, message: "Request cancelled." };
  } catch (error) {
    console.error("Error cancelling purchase request:", error);
    return { success: false, message: "Failed to cancel request." };
  }
};

export const deletePurchaseRequest = async (
  requestId: number,
  userId: string,
) => {
  try {
    const request = await db.query.bookPurchaseRequests.findFirst({
      where: eq(bookPurchaseRequests.id, requestId),
      with: {
        listing: true,
      },
    });

    if (!request) {
      return { success: false, message: "Request not found." };
    }

    // Allow both buyer and seller to delete/cancel
    const listing = unwrapOne(request.listing);
    if (!listing) {
      return { success: false, message: "Listing not found." };
    }

    if (request.buyerId !== userId && listing.sellerId !== userId) {
      return {
        success: false,
        message: "You are not authorized to delete this request.",
      };
    }

    // Remove the restriction that only pending requests can be cancelled/deleted
    // to allow users to clear their history.
    await db
      .delete(bookPurchaseRequests)
      .where(eq(bookPurchaseRequests.id, requestId));

    const counterpartId =
      request.buyerId === userId ? listing.sellerId : request.buyerId;
    if (counterpartId) {
      await sendToUser(counterpartId, {
        title: "Purchase request removed",
        body: `A purchase request for "${listing.title}" was removed.`,
        data: {
          type: "purchase_request_removed",
          requestId: requestId.toString(),
          listingId: listing.id.toString(),
          iconKey: "book",
        },
      });
    }

    return { success: true, message: "Request deleted." };
  } catch (error) {
    console.error("Error deleting purchase request:", error);
    return { success: false, message: "Failed to delete request." };
  }
};

export const deleteMultiplePurchaseRequests = async (
  requestIds: number[],
  userId: string,
) => {
  try {
    if (requestIds.length === 0) {
      return { success: true, message: "No requests to delete." };
    }

    // Security check: ensure all requests belong to the user (as buyer or seller)
    // For bulk delete in "My Requests", we mostly care about the buyer view.
    // However, the backend logic should remain robust.
    // We'll fetch the requests and their associated listings.
    const requests = await db.query.bookPurchaseRequests.findMany({
      where: inArray(bookPurchaseRequests.id, requestIds),
      with: {
        listing: true,
      },
    });

    const authorizedIds = requests
      .filter((req) => {
        const listing = unwrapOne(req.listing);
        return req.buyerId === userId || listing?.sellerId === userId;
      })
      .map((req) => req.id);

    if (authorizedIds.length === 0) {
      return {
        success: false,
        message: "No authorized requests found to delete.",
      };
    }

    await db
      .delete(bookPurchaseRequests)
      .where(inArray(bookPurchaseRequests.id, authorizedIds));

    return {
      success: true,
      message: `${authorizedIds.length} requests deleted.`,
      deletedCount: authorizedIds.length,
    };
  } catch (error) {
    console.error("Error deleting multiple purchase requests:", error);
    return { success: false, message: "Failed to delete requests." };
  }
};
