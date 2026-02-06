import { Request, Response } from "express";
import {
  blockUser,
  createMarketplaceReport,
  getSellerReputation,
  listBlockedUsers,
  listMyMarketplaceReports,
  rateSeller,
  unblockUser,
} from "../services/trust.service.js";

const getUserId = (req: Request): string | null => {
  const authUser = (req as any).user;
  return authUser?.id || null;
};

export const GetSellerReputation = async (req: Request, res: Response) => {
  try {
    const sellerId = req.params.sellerId;
    if (!sellerId) {
      return res.status(400).json({ success: false, message: "Seller ID is required." });
    }

    const result = await getSellerReputation(sellerId);
    return res.json(result);
  } catch (error) {
    console.error("Error in GetSellerReputation controller:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load seller reputation.",
    });
  }
};

export const RateSeller = async (req: Request, res: Response) => {
  try {
    const raterId = getUserId(req);
    if (!raterId) {
      return res.status(401).json({ success: false, message: "Authentication required." });
    }

    const sellerId = req.params.sellerId;
    const { listingId, rating, review } = req.body;

    if (!sellerId || !listingId || typeof rating !== "number") {
      return res.status(400).json({
        success: false,
        message: "sellerId, listingId and rating are required.",
      });
    }

    const result = await rateSeller({
      sellerId,
      raterId,
      listingId: Number(listingId),
      rating,
      review,
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    return res.json(result);
  } catch (error) {
    console.error("Error in RateSeller controller:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to submit seller rating.",
    });
  }
};

export const BlockUser = async (req: Request, res: Response) => {
  try {
    const blockerId = getUserId(req);
    if (!blockerId) {
      return res.status(401).json({ success: false, message: "Authentication required." });
    }

    const blockedUserId = req.params.userId;
    const reason = req.body?.reason;

    if (!blockedUserId) {
      return res.status(400).json({ success: false, message: "User ID is required." });
    }

    const result = await blockUser(blockerId, blockedUserId, reason);
    if (!result.success) return res.status(400).json(result);

    return res.json(result);
  } catch (error) {
    console.error("Error in BlockUser controller:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to block user.",
    });
  }
};

export const UnblockUser = async (req: Request, res: Response) => {
  try {
    const blockerId = getUserId(req);
    if (!blockerId) {
      return res.status(401).json({ success: false, message: "Authentication required." });
    }

    const blockedUserId = req.params.userId;
    if (!blockedUserId) {
      return res.status(400).json({ success: false, message: "User ID is required." });
    }

    const result = await unblockUser(blockerId, blockedUserId);
    return res.json(result);
  } catch (error) {
    console.error("Error in UnblockUser controller:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to unblock user.",
    });
  }
};

export const GetBlockedUsers = async (req: Request, res: Response) => {
  try {
    const blockerId = getUserId(req);
    if (!blockerId) {
      return res.status(401).json({ success: false, message: "Authentication required." });
    }

    const result = await listBlockedUsers(blockerId);
    return res.json(result);
  } catch (error) {
    console.error("Error in GetBlockedUsers controller:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load blocked users.",
    });
  }
};

export const CreateMarketplaceReport = async (req: Request, res: Response) => {
  try {
    const reporterId = getUserId(req);
    if (!reporterId) {
      return res.status(401).json({ success: false, message: "Authentication required." });
    }

    const { reportedUserId, listingId, category, description } = req.body;

    if (!reportedUserId || !category || !description) {
      return res.status(400).json({
        success: false,
        message: "reportedUserId, category and description are required.",
      });
    }

    const result = await createMarketplaceReport({
      reporterId,
      reportedUserId,
      listingId: listingId ? Number(listingId) : undefined,
      category,
      description,
    });

    if (!result.success) return res.status(400).json(result);

    return res.status(201).json(result);
  } catch (error) {
    console.error("Error in CreateMarketplaceReport controller:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to submit report.",
    });
  }
};

export const GetMyMarketplaceReports = async (req: Request, res: Response) => {
  try {
    const reporterId = getUserId(req);
    if (!reporterId) {
      return res.status(401).json({ success: false, message: "Authentication required." });
    }

    const result = await listMyMarketplaceReports(reporterId);
    return res.json(result);
  } catch (error) {
    console.error("Error in GetMyMarketplaceReports controller:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load your reports.",
    });
  }
};

