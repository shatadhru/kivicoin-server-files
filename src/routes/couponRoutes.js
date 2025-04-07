const express = require("express");
const router = express.Router();
const ReferralCodeReceiver = require("../models/Reffarel_Code_from_reciver");

// Create a new coupon
router.post("/", async (req, res) => {
  try {
    const { referralCode, percentage, time } = req.body;
    const newCoupon = new ReferralCodeReceiver({
      referralCode,
      percentage,
      time
    });
    await newCoupon.save();
    res.status(201).json(newCoupon);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get all coupons
router.get("/", async (req, res) => {
  try {
    const coupons = await ReferralCodeReceiver.find().sort({ createdAt: -1 });
    res.json(coupons);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete a coupon
router.delete("/:id", async (req, res) => {
  try {
    const deletedCoupon = await ReferralCodeReceiver.findByIdAndDelete(req.params.id);
    if (!deletedCoupon) {
      return res.status(404).json({ message: "Coupon not found" });
    }
    res.json({ message: "Coupon deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;