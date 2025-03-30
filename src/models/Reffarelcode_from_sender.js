const mongoose = require("mongoose");

const referralCodeSchema = new mongoose.Schema({
  referralCode: { type: String, required: true },
});

// Create Model
const ReferralCode = mongoose.model("ReferralCode", referralCodeSchema);

module.exports = ReferralCode;
