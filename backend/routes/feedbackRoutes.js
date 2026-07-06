import express from "express";
import { submitFeedback, getAllFeedback } from "../controllers/feedbackController.js";
import { protect, requireRole } from "../middleware/auth.js";

const router = express.Router();

router.post("/", protect, submitFeedback);
router.get("/", protect, requireRole("admin"), getAllFeedback);

export default router;
