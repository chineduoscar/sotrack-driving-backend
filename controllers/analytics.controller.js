import Payment from "../models/payment.model.js";

const getDateRange = (period) => {
  const now = new Date();

  switch (period) {
    case "today": {
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      const end = new Date(now);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    }
    case "yesterday": {
      const start = new Date(now);
      start.setDate(start.getDate() - 1);
      start.setHours(0, 0, 0, 0);
      const end = new Date(now);
      end.setDate(end.getDate() - 1);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    }
    case "month": {
      const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      const end = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        0,
        23,
        59,
        59,
        999,
      );
      return { start, end };
    }
    case "all":
    default:
      return null;
  }
};

export const getDashboardStats = async (req, res) => {
  try {
    const period = ["all", "today", "yesterday", "month"].includes(
      req.query.period,
    )
      ? req.query.period
      : "all";

    const range = getDateRange(period);
    const dateFilter = range
      ? { createdAt: { $gte: range.start, $lte: range.end } }
      : {};

    const successFilter = { status: "success", ...dateFilter };

    const [totals] = await Payment.aggregate([
      { $match: successFilter },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: "$amount" },
          totalStudents: { $sum: 1 },
        },
      },
    ]);

    const pendingCount = await Payment.countDocuments({
      status: "pending",
      ...dateFilter,
    });
    const failedCount = await Payment.countDocuments({
      status: "failed",
      ...dateFilter,
    });
    const totalAttempts = await Payment.countDocuments(dateFilter);

    // Revenue broken down by zone
    const byZone = await Payment.aggregate([
      { $match: successFilter },
      {
        $group: {
          _id: "$zone",
          amount: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
      { $sort: { amount: -1 } },
    ]);

    const byPackage = await Payment.aggregate([
      { $match: successFilter },
      {
        $group: {
          _id: "$package",
          amount: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
      { $sort: { amount: -1 } },
    ]);

    const isHourly = period === "today" || period === "yesterday";

    let trendMatch;
    if (range) {
      trendMatch = {
        status: "success",
        createdAt: { $gte: range.start, $lte: range.end },
      };
    } else {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
      sevenDaysAgo.setHours(0, 0, 0, 0);
      trendMatch = { status: "success", createdAt: { $gte: sevenDaysAgo } };
    }

    const dailyTrend = await Payment.aggregate([
      { $match: trendMatch },
      {
        $group: {
          _id: isHourly
            ? {
                $dateToString: { format: "%Y-%m-%d %H:00", date: "$createdAt" },
              }
            : { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          amount: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const recentPayments = await Payment.find(successFilter)
      .sort({ createdAt: -1 })
      .limit(5);

    res.status(200).json({
      success: true,
      period,
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
