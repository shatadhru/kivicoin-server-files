const mongoose = require("mongoose");

// Define the Package schema
const packageSchema = new mongoose.Schema({
  Package_Name: { type: String, required: true },
  Order_ID: { type: String, required: true },
  Payment_ID:{type: Number , required: false},
  Return_Persentage: { type: Number, required: false },
  To_Return_Persentage: { type: Number, required: true },
  persentage: { type: Number, required: false  , default: 2.5},
  total_investment: { type: Number, required: false },
  total_profit: { type: Number, required: false },
  Time_Every: { type: String, required: true },
  For__time: { type: String, required: true },
  Capital_span: { type: String, default: "Included" },
  price: { type: Number, required: true },
  package_genarative_secret: { type: String, required: true },
  start_date: { type: Date, required: false },
  end_date: { type: Date, required: false },
});

// Define the User schema
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: false }, // Optional for Google auth users
  mobile: { type: String, required: false }, // Optional for Google auth users
  balance:{type: Number, required: false , default: 0},
  created_on: { type: Date, default: Date.now },
  total_transactions: { type: Number, default: 0 },
  total_investment: { type: Number, default: 0 },
  total_profit: { type: Number, default: 0 },
  total_withdrawal: { type: Number, default: 0 },
  total_pending_withdrawal: { type: Number, default: 0 },
  recent_transactions_ammount: { type: Number, default: 0 },
  total_referral_bonus: { type: Number, default: 0 },
  total_referral_earning: { type: Number, default: 0 },
  total_earning: { type: Number, default: 0 },
  total_deposit: { type: Number, default: 0 },
  googleId: { type: String, required: false },
  displayName: { type: String, required: false },
  photoURL: { type: String, required: false },
  isAutherised: { type: Boolean, default: false }, // Using Boolean is more appropriate
  verificationToken: { type: String, default: null }, // New field for email verification
  payment: {
    paymentMethod: { type: String, default: "None" },
    total_payments: { type: Number, default: 0 },
  },
  packages: [packageSchema],
});

// Create Model for User
const User = mongoose.model("User", userSchema);

// Export the model
module.exports = User;
