const express = require("express");
const router = express.Router();
const {
  getWithdrawals,
  getWithdrawal,
  updateWithdrawalStatus,
  getWithdrawalStats,
  createWithdrawal,
} = require("../controllers/withdrawalController");

// Routes
router.get("/", getWithdrawals);
router.get("/stats/summary", getWithdrawalStats);
router.get("/:id", getWithdrawal);
router.put("/:id/status", updateWithdrawalStatus);
router.post("/", createWithdrawal);

module.exports = router;
