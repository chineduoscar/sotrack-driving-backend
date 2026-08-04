import express from "express";
import {
  initializePayment,
  verifyPayment,
  paystackWebhook,
  getAllPayments,
  deletePayment,
} from "../controllers/payment.controller.js";
import { getDashboardStats } from "../controllers/analytics.controller.js";
import { authenticate, authorize } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/", authenticate, authorize("admin", "superadmin"), getAllPayments);
router.delete("/:id", authenticate, authorize("superadmin"), deletePayment);
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
