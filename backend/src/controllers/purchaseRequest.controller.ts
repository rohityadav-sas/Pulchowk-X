import { Request, Response } from "express";
import {
    createPurchaseRequest,
    getPurchaseRequestsForListing,
    getMyPurchaseRequests,
    respondToPurchaseRequest,
    getPurchaseRequestStatus,
    cancelPurchaseRequest,
    deletePurchaseRequest,
    deleteMultiplePurchaseRequests,
    getIncomingPurchaseRequests,
} from "../services/purchaseRequest.service.js";

const getUserId = (req: Request): string | null => {
    const user = (req as any).user;
    return user?.id || null;
};

export const CreatePurchaseRequest = async (req: Request, res: Response) => {
    try {
        const userId = getUserId(req);
        if (!userId) {
            return res.status(401).json({ success: false, message: "Authentication required." });
        }

        const listingId = parseInt(req.params.id);
        if (isNaN(listingId)) {
            return res.status(400).json({ success: false, message: "Valid listing ID required." });
        }

        const { message } = req.body;
        const result = await createPurchaseRequest(listingId, userId, message);

        if (!result.success) {
            return res.status(400).json(result);
        }

        return res.status(201).json(result);
    } catch (error) {
        console.error("Error in CreatePurchaseRequest:", error);
        return res.status(500).json({ success: false, message: "An error occurred." });
    }
};

export const GetListingRequests = async (req: Request, res: Response) => {
    try {
        const userId = getUserId(req);
        if (!userId) {
            return res.status(401).json({ success: false, message: "Authentication required." });
        }

        const listingId = parseInt(req.params.id);
        if (isNaN(listingId)) {
            return res.status(400).json({ success: false, message: "Valid listing ID required." });
        }

        const result = await getPurchaseRequestsForListing(listingId, userId);

        if (!result.success) {
            const status = result.message?.includes("not authorized") ? 403 : 400;
            return res.status(status).json(result);
        }

        return res.json(result);
    } catch (error) {
        console.error("Error in GetListingRequests:", error);
        return res.status(500).json({ success: false, message: "An error occurred." });
    }
};

export const GetMyRequests = async (req: Request, res: Response) => {
    try {
        const userId = getUserId(req);
        if (!userId) {
            return res.status(401).json({ success: false, message: "Authentication required." });
        }

        const result = await getMyPurchaseRequests(userId);

        if (!result.success) {
            return res.status(400).json(result);
        }

        return res.json(result);
    } catch (error) {
        console.error("Error in GetMyRequests:", error);
        return res.status(500).json({ success: false, message: "An error occurred." });
    }
};

export const GetIncomingRequests = async (req: Request, res: Response) => {
    try {
        const userId = getUserId(req);
        if (!userId) {
            return res.status(401).json({ success: false, message: "Authentication required." });
        }

        const result = await getIncomingPurchaseRequests(userId);

        if (!result.success) {
            return res.status(400).json(result);
        }

        return res.json(result);
    } catch (error) {
        console.error("Error in GetIncomingRequests:", error);
        return res.status(500).json({ success: false, message: "An error occurred." });
    }
};

export const RespondToRequest = async (req: Request, res: Response) => {
    try {
        const userId = getUserId(req);
        if (!userId) {
            return res.status(401).json({ success: false, message: "Authentication required." });
        }

        const requestId = parseInt(req.params.requestId);
        if (isNaN(requestId)) {
            return res.status(400).json({ success: false, message: "Valid request ID required." });
        }

        const { accept } = req.body;
        if (typeof accept !== "boolean") {
            return res.status(400).json({ success: false, message: "Accept must be true or false." });
        }

        const result = await respondToPurchaseRequest(requestId, userId, accept);

        if (!result.success) {
            const status = result.message?.includes("not authorized") ? 403 : 400;
            return res.status(status).json(result);
        }

        return res.json(result);
    } catch (error) {
        console.error("Error in RespondToRequest:", error);
        return res.status(500).json({ success: false, message: "An error occurred." });
    }
};

export const GetRequestStatus = async (req: Request, res: Response) => {
    try {
        const userId = getUserId(req);
        if (!userId) {
            return res.status(401).json({ success: false, message: "Authentication required." });
        }

        const listingId = parseInt(req.params.id);
        if (isNaN(listingId)) {
            return res.status(400).json({ success: false, message: "Valid listing ID required." });
        }

        const result = await getPurchaseRequestStatus(listingId, userId);

        if (!result.success) {
            return res.status(400).json(result);
        }

        return res.json(result);
    } catch (error) {
        console.error("Error in GetRequestStatus:", error);
        return res.status(500).json({ success: false, message: "An error occurred." });
    }
};

export const CancelRequest = async (req: Request, res: Response) => {
    try {
        const userId = getUserId(req);
        if (!userId) {
            return res.status(401).json({ success: false, message: "Authentication required." });
        }

        const requestId = parseInt(req.params.requestId);
        if (isNaN(requestId)) {
            return res.status(400).json({ success: false, message: "Valid request ID required." });
        }

        const result = await cancelPurchaseRequest(requestId, userId);

        if (!result.success) {
            const status = result.message?.includes("not authorized") ? 403 : 400;
            return res.status(status).json(result);
        }

        return res.json(result);
    } catch (error) {
        console.error("Error in CancelRequest:", error);
        return res.status(500).json({ success: false, message: "An error occurred." });
    }
};

export const DeleteRequest = async (req: Request, res: Response) => {
    try {
        const userId = getUserId(req);
        if (!userId) {
            return res.status(401).json({ success: false, message: "Authentication required." });
        }

        const requestId = parseInt(req.params.requestId);
        if (isNaN(requestId)) {
            return res.status(400).json({ success: false, message: "Valid request ID required." });
        }

        const result = await deletePurchaseRequest(requestId, userId);

        if (!result.success) {
            const status = result.message?.includes("not authorized") ? 403 : 400;
            return res.status(status).json(result);
        }

        return res.json(result);
    } catch (error) {
        console.error("Error in DeleteRequest:", error);
        return res.status(500).json({ success: false, message: "An error occurred." });
    }
};

export const DeleteMultipleRequests = async (req: Request, res: Response) => {
    try {
        const userId = getUserId(req);
        if (!userId) {
            return res.status(401).json({ success: false, message: "Authentication required." });
        }

        const { requestIds } = req.body;
        if (!Array.isArray(requestIds)) {
            return res.status(400).json({ success: false, message: "requestIds must be an array of numbers." });
        }

        // Convert to numbers and filter out NaNs
        const ids = requestIds.map(id => parseInt(id)).filter(id => !isNaN(id));

        if (ids.length === 0) {
            return res.status(400).json({ success: false, message: "No valid request IDs provided." });
        }

        const result = await deleteMultiplePurchaseRequests(ids, userId);

        if (!result.success) {
            return res.status(400).json(result);
        }

        return res.json(result);
    } catch (error) {
        console.error("Error in DeleteMultipleRequests:", error);
        return res.status(500).json({ success: false, message: "An error occurred." });
    }
};
