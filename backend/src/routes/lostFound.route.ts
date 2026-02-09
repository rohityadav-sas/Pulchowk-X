import express from "express";
import multer from "multer";
import { optionalAuth, requireAuth } from "../middleware/auth.middleware.js";
import {
  AddLostFoundImage,
  CreateLostFoundClaim,
  CreateLostFoundItem,
  DeleteLostFoundImage,
  DeleteLostFoundItem,
  GetLostFoundItem,
  GetMyLostFoundClaims,
  GetMyLostFoundItems,
  ListLostFoundItems,
  ListOwnerItemClaims,
  UpdateClaimStatus,
  UpdateLostFoundItem,
  UpdateLostFoundItemStatus,
} from "../controllers/lostFound.controller.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.get("/", optionalAuth, ListLostFoundItems);
router.get("/my/items", requireAuth, GetMyLostFoundItems);
router.get("/my/claims", requireAuth, GetMyLostFoundClaims);
router.get("/:id", optionalAuth, GetLostFoundItem);

router.post("/", requireAuth, CreateLostFoundItem);
router.put("/:id", requireAuth, UpdateLostFoundItem);
router.delete("/:id", requireAuth, DeleteLostFoundItem);

router.post("/:id/images", requireAuth, upload.single("image"), AddLostFoundImage);
router.delete("/:id/images/:imageId", requireAuth, DeleteLostFoundImage);

router.post("/:id/claims", requireAuth, CreateLostFoundClaim);
router.get("/:id/claims", requireAuth, ListOwnerItemClaims);
router.put("/:id/claims/:claimId", requireAuth, UpdateClaimStatus);
router.put("/:id/status", requireAuth, UpdateLostFoundItemStatus);

export default router;
