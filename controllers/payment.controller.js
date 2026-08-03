import axios from "axios";
import Payment from "../models/payment.model.js";
import crypto from "crypto";
import { zones } from "../data/zones.js";
import { PACKAGES, TIERS } from "../constants/pricing.constants.js";

export const initializePayment = async (req, res) => {
  try {
    const {
      fullName,
      surname,
      otherName,
      email,
      phoneNumber,
      contactAddress,
      dateOfBirth,
      stateOfOrigin,
      maritalStatus,
      homeTown,
      qualification,
      previousExperience,
      languageSpoken,
      agreeToRules,
      referee,
      zoneId,
      package: pkg,
      tier,
    } = req.body;

    if (
      !fullName ||
      !surname ||
      !otherName ||
      !email ||
      !phoneNumber ||
      !contactAddress ||
      !dateOfBirth ||
      !stateOfOrigin ||
      !maritalStatus ||
      !homeTown ||
      !languageSpoken ||
      !agreeToRules ||
      !zoneId ||
      !pkg ||
      !tier
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Please fill in all required fields and agree to the rules before continuing.",
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

    // Referee is optional — only forward it if the person filled at least
    // one field, so we don't store an object of empty strings.
    const refereeData =
      referee && (referee.name || referee.address || referee.phoneNumber)
        ? {
            name: referee.name || null,
            address: referee.address || null,
            phoneNumber: referee.phoneNumber || null,
          }
        : null;

    const response = await axios.post(
      "https://api.paystack.co/transaction/initialize",
      {
        email,
        amount: amount * 100,
        reference,
        callback_url: `${process.env.FRONTEND_URL}/zones/${zone.id}/checkout/success`,
        metadata: {
          fullName,
          surname,
          otherName,
          phoneNumber,
          contactAddress,
          dateOfBirth,
          stateOfOrigin,
          maritalStatus,
          homeTown,
          qualification: qualification || null,
          previousExperience: previousExperience || null,
          languageSpoken,
          agreeToRules,
          referee: refereeData,
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
      surname,
      otherName,
      email,
      phoneNumber,
      contactAddress,
      dateOfBirth,
      stateOfOrigin,
      maritalStatus,
      homeTown,
      qualification: qualification || null,
      previousExperience: previousExperience || null,
      languageSpoken,
      agreeToRules,
      referee: refereeData,
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

// Shared shape-mapper: Paystack's metadata (set during initializePayment)
// is the source of truth once we're verifying/webhook-confirming a charge.
const buildUpdateDataFromPaystack = (payment) => ({
  fullName: payment.metadata?.fullName,
  surname: payment.metadata?.surname,
  otherName: payment.metadata?.otherName,
  email: payment.customer?.email,
  phoneNumber: payment.metadata?.phoneNumber,
  contactAddress: payment.metadata?.contactAddress,
  dateOfBirth: payment.metadata?.dateOfBirth,
  stateOfOrigin: payment.metadata?.stateOfOrigin,
  maritalStatus: payment.metadata?.maritalStatus,
  homeTown: payment.metadata?.homeTown,
  qualification: payment.metadata?.qualification ?? null,
  previousExperience: payment.metadata?.previousExperience ?? null,
  languageSpoken: payment.metadata?.languageSpoken,
  agreeToRules: payment.metadata?.agreeToRules,
  referee:
    payment.metadata?.referee && typeof payment.metadata.referee === "object"
      ? payment.metadata.referee
      : null,
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
});

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

    const updateData = buildUpdateDataFromPaystack(payment);

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
    console.error(
      "verifyPayment error:",
      error.response?.status,
      error.response?.data || error.message,
    );
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

      const updateData = buildUpdateDataFromPaystack(payment);

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
1;
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

export const deletePayment = async (req, res) => {
  try {
    const { id } = req.params;

    const payment = await Payment.findByIdAndDelete(id);

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found.",
      });
    }

    res.status(200).json({
      success: true,
      message: "Payment deleted successfully.",
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
