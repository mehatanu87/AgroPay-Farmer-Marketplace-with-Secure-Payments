import express from "express";
import {
  getListings,
  getListingById,
  createListing,
  updateListingStatus,
  getMyListings,
} from "../controllers/listingController.js";
import { protect, requireRole } from "../middleware/auth.js";
import { upload } from "../middleware/upload.js";

const router = express.Router();

router.get("/", getListings);
router.get("/mine", protect, requireRole("farmer"), getMyListings);
router.get("/:id", getListingById);
router.post("/", protect, requireRole("farmer"), upload.single("image"), createListing);
router.patch("/:id/status", protect, requireRole("farmer", "admin"), updateListingStatus);

export default router;
