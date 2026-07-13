import express from "express";
import {
  initializePayment,
  verifyPayment,
  paystackWebhook,
  getAllPayments,
  getDashboardStats,
} from "../controllers/payment.controller.js";

const router = express.Router();

router.get("/", getAllPayments);
router.post("/initialize", initializePayment);
router.get("/verify/:reference", verifyPayment);

router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  paystackWebhook,
);
router.get("/stats/dashboard", getDashboardStats);

export default router;
