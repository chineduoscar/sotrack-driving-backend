import express from "express";
import {
  initializePayment,
  verifyPayment,
  paystackWebhook,
} from "../controllers/payment.controller.js";

const router = express.Router();

router.post("/initialize", initializePayment);
router.get("/verify/:reference", verifyPayment);

router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  paystackWebhook,
);

export default router;
