import express from "express";
import { requireAdmin, requireAuth } from "../middleware/auth.middleware.js";
import {
  GetAdminOverview,
  GetAdminUsers,
  GetModerationReports,
  ToggleSellerVerification,
  UpdateAdminUserRole,
  UpdateModerationReport,
} from "../controllers/admin.controller.js";

const router = express.Router();

router.use(requireAuth, requireAdmin);

router.get("/overview", GetAdminOverview);
router.get("/users", GetAdminUsers);
router.put("/users/:userId/role", UpdateAdminUserRole);
router.put("/users/:userId/verify-seller", ToggleSellerVerification);
router.get("/reports", GetModerationReports);
router.put("/reports/:reportId", UpdateModerationReport);

export default router;

