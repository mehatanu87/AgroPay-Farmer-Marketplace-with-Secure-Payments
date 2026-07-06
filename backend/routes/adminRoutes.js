import express from "express";
import {
  verifyFarmer,
  getDashboardStats,
  getRecentEvents,
  getDisputedOrders,
} from "../controllers/adminController.js";
import { protect, requireRole } from "../middleware/auth.js";

const router = express.Router();

router.use(protect, requireRole("admin"));

router.patch("/farmers/:id/verify", verifyFarmer);
router.get("/stats", getDashboardStats);
router.get("/events", getRecentEvents);
router.get("/disputes", getDisputedOrders);

export default router;
