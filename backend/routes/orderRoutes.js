import express from "express";
import {
  createOrder,
  markDelivered,
  confirmOrder,
  disputeOrder,
  getMyOrders,
  getOrderById,
} from "../controllers/orderController.js";
import { protect, requireRole } from "../middleware/auth.js";
import { upload } from "../middleware/upload.js";

const router = express.Router();

router.post("/", protect, requireRole("buyer"), createOrder);
router.get("/mine", protect, getMyOrders);
router.get("/:id", protect, getOrderById);
router.patch("/:id/deliver", protect, requireRole("farmer"), upload.single("proof"), markDelivered);
router.patch("/:id/confirm", protect, requireRole("buyer"), confirmOrder);
router.patch("/:id/dispute", protect, requireRole("buyer"), disputeOrder);

export default router;
