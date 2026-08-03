import express from "express";
import {
  initializePayment,
  verifyPayment,
  paystackWebhook,
  getAllPayments,
  getDashboardStats,
} from "../controllers/payment.controller.js";
import { authenticate, authorize } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/", authenticate, authorize("admin", "superadmin"), getAllPayments);
router.post("/initialize", initializePayment);
router.get("/verify/:reference", verifyPayment);

router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  paystackWebhook,
);
router.get(
  "/stats/dashboard",
  authenticate,
  authorize("admin", "superadmin"),
  getDashboardStats,
);

export default router;
