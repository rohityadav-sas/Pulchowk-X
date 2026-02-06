import express from "express";
import { SearchAll } from "../controllers/search.controller.js";
import { optionalAuth } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/", optionalAuth, SearchAll);

export default router;

