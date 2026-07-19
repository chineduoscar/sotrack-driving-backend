import axios from "axios";
import Payment from "../models/payment.model.js";
import crypto from "crypto";
import { zones } from "../data/zones.js";
import { PACKAGES, TIERS } from "../constants/pricing.constants.js";

export const initializePayment = async (req, res) => {
  try {
    const {
      fullName,
      email,
      phoneNumber,
      zoneId,
      package: pkg,
      tier,
    } = req.body;

    if (!fullName || !email || !phoneNumber || !zoneId || !pkg || !tier) {
      return res.status(400).json({
        success: false,
        message:
          "fullName, email, phoneNumber, zoneId, package, and tier are all required.",
      });
    }

    if (!PACKAGES.includes(pkg)) {
      return res.status(400).json({
        success: false,
        message: "Invalid package selected.",
      });
    }

    if (!TIERS.includes(tier)) {
      return res.status(400).json({
        success: false,
        message: "Invalid experience tier selected.",
      });
    }

    const zone = zones.find((z) => z.id === Number(zoneId));

    if (!zone) {
      return res.status(404).json({
        success: false,
        message: "Zone not found.",
      });
    }

    // Amount is always derived from our own pricing data, never from the
    // client — this is what stops someone from tampering with the price
    // in the checkout request.
    const amount = zone.pricing[pkg]?.[tier];

    if (amount === undefined) {
      // e.g. "refresher" doesn't exist on weekendExecutive for this zone
      return res.status(400).json({
        success: false,
        message: "That experience tier isn't available for this package.",
      });
    }

    const reference = `SOTRACK_${Date.now()}`;

    const response = await axios.post(
      "https://api.paystack.co/transaction/initialize",
      {
        email,
        amount: amount * 100,
        reference,
        callback_url: `${process.env.FRONTEND_URL}/zones/${zone.id}/checkout/success`,
        metadata: {
          fullName,
          phoneNumber,
          zoneId: zone.id,
          zoneName: zone.name,
          package: pkg,
          tier,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
      },
    );

    await Payment.create({
      fullName,
      email,
      phoneNumber,
      zone: zone.name,
      zoneId: zone.id,
      package: pkg,
      tier,
      amount,
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
      zone: payment.metadata?.zoneName,
      zoneId: payment.metadata?.zoneId,
      package: payment.metadata?.package,
      tier: payment.metadata?.tier,
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
        zone: payment.metadata?.zoneName,
        zoneId: payment.metadata?.zoneId,
        package: payment.metadata?.package,
        tier: payment.metadata?.tier,
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

export const getAllPayments = async (req, res) => {
  try {
    const { status } = req.query;

    const filter = {};
    if (status && status !== "all") {
      filter.status = status;
    }

    const payments = await Payment.find(filter).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: payments.length,
      payments,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getDashboardStats = async (req, res) => {
  try {
    const [totals] = await Payment.aggregate([
      { $match: { status: "success" } },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: "$amount" },
          totalStudents: { $sum: 1 },
        },
      },
    ]);

    const pendingCount = await Payment.countDocuments({ status: "pending" });
    const failedCount = await Payment.countDocuments({ status: "failed" });
    const totalAttempts = await Payment.countDocuments({});

    // Revenue broken down by zone
    const byZone = await Payment.aggregate([
      { $match: { status: "success" } },
      {
        $group: {
          _id: "$zone",
          amount: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
      { $sort: { amount: -1 } },
    ]);

    // Revenue broken down by package (standard / executive / weekend / weekendExecutive)
    const byPackage = await Payment.aggregate([
      { $match: { status: "success" } },
      {
        $group: {
          _id: "$package",
          amount: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
      { $sort: { amount: -1 } },
    ]);

    // Last 7 days revenue trend
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const dailyTrend = await Payment.aggregate([
      { $match: { status: "success", createdAt: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          amount: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const recentPayments = await Payment.find({ status: "success" })
      .sort({ createdAt: -1 })
      .limit(5);

    res.status(200).json({
      success: true,
      stats: {
        totalRevenue: totals?.totalAmount || 0,
        totalStudents: totals?.totalStudents || 0,
        pendingCount,
        failedCount,
        totalAttempts,
        conversionRate: totalAttempts
          ? (((totals?.totalStudents || 0) / totalAttempts) * 100).toFixed(1)
          : 0,
        byZone,
        byPackage,
        dailyTrend,
        recentPayments,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
