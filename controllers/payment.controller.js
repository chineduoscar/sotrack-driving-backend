import axios from "axios";
import Payment from "../models/payment.model.js";
import crypto from "crypto";

export const initializePayment = async (req, res) => {
  try {
    const { fullName, email, phoneNumber, zone, amount } = req.body;

    if (!fullName || !email || !phoneNumber || !zone || !amount) {
      return res.status(400).json({
        success: false,
        message: "All fields are required.",
      });
    }

    const numericAmount = Number(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid amount.",
      });
    }

    const reference = `SOTRACK_${Date.now()}`;

    const response = await axios.post(
      "https://api.paystack.co/transaction/initialize",
      {
        email,
        amount: numericAmount * 100,
        reference,
        callback_url: `${process.env.FRONTEND_URL}/payment/success`,
        metadata: {
          fullName,
          phoneNumber,
          zone,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
      },
    );

    // Save a pending record so we have a trail even if the user never returns
    await Payment.create({
      fullName,
      email,
      phoneNumber,
      zone,
      amount: numericAmount,
      reference,
      status: "pending",
    });

    return res.status(200).json({
      success: true,
      message: "Payment initialized successfully.",
      authorization_url: response.data.data.authorization_url,
      access_code: response.data.data.access_code,
      reference: response.data.data.reference,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.response?.data?.message || "Unable to initialize payment.",
    });
  }
};

export const verifyPayment = async (req, res) => {
  try {
    const { reference } = req.params;

    const response = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        },
      },
    );

    const payment = response.data.data;

    const existingPayment = await Payment.findOne({ reference });

    if (existingPayment && existingPayment.status === "success") {
      return res.status(200).json({
        success: true,
        message: "Payment already verified.",
        payment: existingPayment,
      });
    }

    if (payment.status !== "success") {
      return res.status(400).json({
        success: false,
        message: "Payment was not successful.",
      });
    }

    const updateData = {
      fullName: payment.metadata?.fullName,
      email: payment.customer?.email,
      phoneNumber: payment.metadata?.phoneNumber,
      zone: payment.metadata?.zone,
      amount: payment.amount / 100,
      reference: payment.reference,
      paymentMethod: payment.channel,
      currency: payment.currency,
      status: payment.status,
      paidAt: payment.paid_at,
    };

    const savedPayment = await Payment.findOneAndUpdate(
      { reference },
      updateData,
      { upsert: true, new: true },
    );

    return res.status(200).json({
      success: true,
      message: "Payment verified successfully.",
      paymentId: savedPayment._id,
      payment: savedPayment,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.response?.data?.message || "Unable to verify payment.",
    });
  }
};

export const paystackWebhook = async (req, res) => {
  try {
    const secret = process.env.PAYSTACK_SECRET_KEY;

    const hash = crypto
      .createHmac("sha512", secret)
      .update(req.body)
      .digest("hex");

    const signature = req.headers["x-paystack-signature"];

    if (!signature || hash !== signature) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid signature." });
    }

    const event = JSON.parse(req.body.toString("utf8"));

    if (event.event === "charge.success") {
      const payment = event.data;

      const updateData = {
        fullName: payment.metadata?.fullName,
        email: payment.customer?.email,
        phoneNumber: payment.metadata?.phoneNumber,
        zone: payment.metadata?.zone,
        amount: payment.amount / 100,
        reference: payment.reference,
        paymentMethod: payment.channel,
        currency: payment.currency,
        status: payment.status,
        paidAt: payment.paid_at,
      };

      await Payment.findOneAndUpdate(
        { reference: payment.reference },
        updateData,
        { upsert: true, new: true },
      );
    }

    return res.sendStatus(200);
  } catch (error) {
    console.error("Webhook error:", error);
    return res.sendStatus(500);
  }
};
