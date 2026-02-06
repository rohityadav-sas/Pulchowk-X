import { Request, Response } from "express";
import { globalSearch } from "../services/search.service.js";

const getUserId = (req: Request): string | undefined => {
  const authUser = (req as any).user;
  return authUser?.id;
};

export const SearchAll = async (req: Request, res: Response) => {
  try {
    const query = (req.query.q as string | undefined) ?? "";
    const limit = req.query.limit ? Number(req.query.limit) : undefined;

    const result = await globalSearch({
      query,
      limit,
      userId: getUserId(req),
    });

    return res.json(result);
  } catch (error) {
    console.error("Error in SearchAll controller:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to perform search.",
    });
  }
};

