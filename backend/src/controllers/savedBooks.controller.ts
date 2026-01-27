import { Request, Response } from "express";
import {
    getSavedBooksCount,
    getUserSavedBooks,
    isBookSaved,
    saveBook,
    unsaveBook,
    updateSavedBooksNotes
} from "../services/book.service.js";


const getUserId = (req: Request): string | null => {
    const user = (req as any).user;
    return user?.id || null;
};

export const SaveBook = async (req: Request, res: Response) => {
    try {
        const userId = getUserId(req);
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Authentication required.",
            });
        }

        const { listingId, notes } = req.body;

        if (!listingId) {
            return res.status(400).json({
                success: false,
                message: "Listing ID is required.",
            });
        }

        const result = await saveBook(userId, listingId, notes);

        if (!result.success) {
            return res.status(400).json(result);
        }

        return res.status(201).json(result);
    } catch (error) {
        console.error("Error in SaveBook controller:", error);
        return res.status(500).json({
            success: false,
            message: "An error occurred while saving the book.",
        });
    }
};

export const UnsaveBook = async (req: Request, res: Response) => {
    try {
        const userId = getUserId(req);
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Authentication required.",
            });
        }

        const listingId = parseInt(req.params.id);
        if (isNaN(listingId)) {
            return res.status(400).json({
                success: false,
                message: "Valid listing ID is required.",
            });
        }

        const result = await unsaveBook(userId, listingId);

        if (!result.success) {
            return res.status(400).json(result);
        }

        return res.json(result);
    } catch (error) {
        console.error("Error in UnsaveBook controller:", error);
        return res.status(500).json({
            success: false,
            message: "An error occurred while unsaving the book.",
        });
    }
};

export const GetSavedBooks = async (req: Request, res: Response) => {
    try {
        const userId = getUserId(req);
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Authentication required.",
            });
        }

        const result = await getUserSavedBooks(userId);

        if (!result.success) {
            return res.status(400).json(result);
        }

        return res.json(result);
    } catch (error) {
        console.error("Error in GetSavedBooks controller:", error);
        return res.status(500).json({
            success: false,
            message: "An error occurred while retrieving saved books.",
        });
    }
};

export const UpdateNotes = async (req: Request, res: Response) => {
    try {
        const userId = getUserId(req);
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Authentication required.",
            });
        }

        const listingId = parseInt(req.params.id);
        if (isNaN(listingId)) {
            return res.status(400).json({
                success: false,
                message: "Valid listing ID is required.",
            });
        }

        const { notes } = req.body;
        const result = await updateSavedBooksNotes(userId, listingId, notes);

        if (!result.success) {
            return res.status(400).json(result);
        }

        return res.json(result);
    } catch (error) {
        console.error("Error in UpdateNotes controller:", error);
        return res.status(500).json({
            success: false,
            message: "An error occurred while updating notes.",
        });
    }
};

export const CheckIfSaved = async (req: Request, res: Response) => {
    try {
        const userId = getUserId(req);
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Authentication required.",
            });
        }

        const listingId = parseInt(req.params.id);
        if (isNaN(listingId)) {
            return res.status(400).json({
                success: false,
                message: "Valid listing ID is required.",
            });
        }

        const result = await isBookSaved(userId, listingId);

        if (!result.success) {
            return res.status(400).json(result);
        }

        return res.json(result);
    } catch (error) {
        console.error("Error in CheckIfSaved controller:", error);
        return res.status(500).json({
            success: false,
            message: "An error occurred while checking if the book is saved.",
        });
    }
};

export const GetSavedBooksCount = async (req: Request, res: Response) => {
    try {
        const userId = getUserId(req);
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Authentication required.",
            });
        }

        const result = await getSavedBooksCount(userId);

        if (!result.success) {
            return res.status(400).json(result);
        }

        return res.json(result);
    } catch (error) {
        console.error("Error in GetSavedBooksCount controller:", error);
        return res.status(500).json({
            success: false,
            message: "An error occurred while getting the saved books count.",
        });
    }
};