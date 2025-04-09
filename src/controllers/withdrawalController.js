const Withdrawal = require("../models/WithdrawalRequest");

// Get all withdrawals
exports.getWithdrawals = async (req, res) => {
  try {
    const { status, paymentMethod, search, page = 1000, limit = 1000 } = req.query;

    const query = {};

    if (status && status !== "all") {
      query.status = status;
    }

    if (paymentMethod && paymentMethod !== "all") {
      query.paymentMethod = paymentMethod;
    }

    if (search) {
      const searchRegex = new RegExp(search, "i");
      query.$or = [
        { userId: searchRegex },
        { transactionId: searchRegex },
        { "bankDetails.accountName": searchRegex },
        { "paypalDetails.email": searchRegex },
        { "cryptoDetails.walletAddress": searchRegex },
        { "skrillDetails.email": searchRegex },
      ];
    }

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { createdAt: -1 },
    };

    const withdrawals = await Withdrawal.paginate(query, options);

    res.json({
      withdrawals: withdrawals.docs,
      totalWithdrawals: withdrawals.totalDocs,
      totalPages: withdrawals.totalPages,
      currentPage: withdrawals.page,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error" });
  }
};

// Get withdrawal by ID
exports.getWithdrawal = async (req, res) => {
  try {
    const withdrawal = await Withdrawal.findById(req.params.id);

    if (!withdrawal) {
      return res.status(404).json({ message: "Withdrawal not found" });
    }

    res.json(withdrawal);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error" });
  }
};

// Update withdrawal status
exports.updateWithdrawalStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const { id } = req.params;

    if (!status) {
      return res.status(400).json({ message: "Status is required" });
    }

    const withdrawal = await Withdrawal.findById(id);

    if (!withdrawal) {
      return res.status(404).json({ message: "Withdrawal not found" });
    }

    withdrawal.status = status;

    if (status === "completed" || status === "failed") {
      withdrawal.processedAt = new Date();
    }

    await withdrawal.save();

    res.json(withdrawal);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error" });
  }
};

// Get withdrawal statistics
exports.getWithdrawalStats = async (req, res) => {
  try {
    const stats = {};

    // Total withdrawals
    stats.total = await Withdrawal.countDocuments();

    // Count by status
    stats.pending = await Withdrawal.countDocuments({ status: "pending" });
    stats.processing = await Withdrawal.countDocuments({
      status: "processing",
    });
    stats.completed = await Withdrawal.countDocuments({ status: "completed" });
    stats.failed = await Withdrawal.countDocuments({ status: "failed" });
    stats.cancelled = await Withdrawal.countDocuments({ status: "cancelled" });

    // Total amount and fees
    const amountStats = await Withdrawal.aggregate([
      {
        $group: {
          _id: null,
          totalAmount: { $sum: "$amount" },
          totalFees: { $sum: "$fee" },
        },
      },
    ]);

    stats.totalAmount = amountStats[0]?.totalAmount || 0;
    stats.totalFees = amountStats[0]?.totalFees || 0;

    res.json(stats);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error" });
  }
};

// Create a new withdrawal
exports.createWithdrawal = async (req, res) => {
  try {
    const {
      userId,
      amount,
      paymentMethod,
      bankDetails,
      paypalDetails,
      cryptoDetails,
      skrillDetails,
    } = req.body;

    // Validate required fields
    if (!amount || !paymentMethod) {
      return res
        .status(400)
        .json({ message: "Amount and payment method are required" });
    }

    // Validate payment details based on method
    if (paymentMethod === "bank-transfer" && !bankDetails) {
      return res
        .status(400)
        .json({ message: "Bank details are required for bank transfer" });
    }

    if (paymentMethod === "paypal" && !paypalDetails?.email) {
      return res.status(400).json({ message: "PayPal email is required" });
    }

    if (paymentMethod === "crypto" && !cryptoDetails?.walletAddress) {
      return res
        .status(400)
        .json({ message: "Crypto wallet address is required" });
    }

    if (paymentMethod === "skrill" && !skrillDetails?.email) {
      return res.status(400).json({ message: "Skrill email is required" });
    }

    // Create withdrawal
    const withdrawal = new Withdrawal({
      userId,
      amount,
      paymentMethod,
      bankDetails: paymentMethod === "bank-transfer" ? bankDetails : undefined,
      paypalDetails: paymentMethod === "paypal" ? paypalDetails : undefined,
      cryptoDetails: paymentMethod === "crypto" ? cryptoDetails : undefined,
      skrillDetails: paymentMethod === "skrill" ? skrillDetails : undefined,
      status: "pending",
    });

    await withdrawal.save();

    res.status(201).json(withdrawal);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error" });
  }
};
