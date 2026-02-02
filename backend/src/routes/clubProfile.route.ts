import express from "express";
import {
    CreateClubProfile,
    createEventDetail,
    GetEventDetails,
    getProfile,
    UpdateClubProfile,
    UpdateEventDetail
} from "../controllers/clubProfiles.controller.js";
import {
    UploadClubLogo,
    DeleteClubLogo
} from "../controllers/event.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import multer from "multer";
import {
    CreateEventCategory,
    UpdateEventCategory,
    GetEventCategories,
    GetEventCategory,
    DeleteEventCategory
} from "../controllers/eventCategories.controller.js";


const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post("/club-profile", requireAuth, CreateClubProfile);
router.get("/club-profile/:clubId", requireAuth, getProfile);
router.put("/club-profile/:clubId", requireAuth, UpdateClubProfile);

router.post("/:clubId/upload-logo", requireAuth, upload.single('logo'), UploadClubLogo);
router.delete("/:clubId/upload-logo", requireAuth, DeleteClubLogo);

router.post("/event-details/create-event-details", requireAuth, createEventDetail);
router.put("/event-details/update-eventdetail", requireAuth, UpdateEventDetail);
router.get("/event-details/:eventId", requireAuth, GetEventDetails);


router.post("/event-categories", requireAuth, CreateEventCategory);
router.get("/event-categories/:clubId", requireAuth, GetEventCategories);
router.get("/event-category/:categoryId", requireAuth, GetEventCategory);
router.put("/event-category/:categoryId", requireAuth, UpdateEventCategory);
router.delete("/event-category/:categoryId", requireAuth, DeleteEventCategory);

export default router;
