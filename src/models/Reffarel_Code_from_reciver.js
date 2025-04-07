const mongoose = require("mongoose");

const referralCodeReceiverSchema = new mongoose.Schema({
  referralCode: { type: String, required: true },
  persentage: { type: Number, required: false },
  time: { type: String, required: false , default: "12H"  },
});

// Create Model
const ReferralCodeReceiver = mongoose.model(
  "ReferralCodeReceiver",
  referralCodeReceiverSchema
);

module.exports = ReferralCodeReceiver;
