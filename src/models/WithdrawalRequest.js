const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2"); // ✅ Import paginate plugin

const bankAccountSchema = new mongoose.Schema({
  accountNumber: { type: String, required: true },
  accountName: { type: String, required: true },
  bankName: { type: String, required: true },
  iban: { type: String },
  swiftCode: { type: String },
});

const paypalSchema = new mongoose.Schema({
  email: { type: String, required: true },
});

const cryptoSchema = new mongoose.Schema({
  walletAddress: { type: String, required: true },
  network: {
    type: String,
    enum: ["ERC20", "TRC20", "BEP20", "BTC"],
    default: "ERC20",
  },
  coinType: {
    type: String,
    enum: ["USDT", "BTC", "ETH", "USDC"],
    default: "USDT",
  },
});

const skrillSchema = new mongoose.Schema({
  email: { type: String, required: true },
});

const withdrawalSchema = new mongoose.Schema({
  userId: { type: String, ref: "User", required: false },
  email: { type: String, required: false }, 
  amount: { type: Number, required: true },
  fee: { type: Number, required: false },
  currency: { type: String, default: "USD" },
  paymentMethod: {
    type: String,
    enum: ["bank-transfer", "paypal", "crypto", "skrill"],
    required: false,
  },
  status: {
    type: String,
    enum: ["pending", "processing", "completed", "failed", "cancelled"],
    default: "pending",
  },
  bankDetails: bankAccountSchema,
  paypalDetails: paypalSchema,
  cryptoDetails: cryptoSchema,
  skrillDetails: skrillSchema,
  transactionId: { type: String },
  processedAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// ✅ Calculate fee before saving
withdrawalSchema.pre("save", function (next) {
  const methodFees = {
    "bank-transfer": 0.015, // 1.5%
    paypal: 0.029, // 2.9% + $0.30
    crypto: 0.005, // 0.5%
    skrill: 0.01, // 1.0%
  };

  if (this.paymentMethod === "paypal") {
    this.fee = this.amount * methodFees[this.paymentMethod] + 0.3;
  } else {
    this.fee = this.amount * methodFees[this.paymentMethod];
  }

  this.updatedAt = Date.now();
  next();
});

// ✅ Attach pagination plugin
withdrawalSchema.plugin(mongoosePaginate);

// ✅ Export model
module.exports = mongoose.model("Withdrawal", withdrawalSchema);
