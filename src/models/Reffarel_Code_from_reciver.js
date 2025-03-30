const mongoose = require("mongoose");

const referralCodeReceiverSchema = new mongoose.Schema({
  referralCode: { type: String, required: true },
  persentage: { type: Number, required: false },
});

// Create Model
const ReferralCodeReceiver = mongoose.model(
  "ReferralCodeReceiver",
  referralCodeReceiverSchema
);

module.exports = ReferralCodeReceiver;
