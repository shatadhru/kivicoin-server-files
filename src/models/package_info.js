const mongoose = require("mongoose");

const packageSchema = new mongoose.Schema({
  Package_Name: { type: String, required: true },
  Order_ID: { type: String, required: true },
  Payment_ID: { type: Number, required: false },
  Return_Persentage: { type: Number, required: false },
  To_Return_Persentage: { type: Number, required: true },
  persentage: { type: Number, required: false, default: 2.5 },
  total_investment: { type: Number, required: false },
  total_profit: { type: Number, required: false },
  Duration: { type: String, required: true },
  duration_value: { type: Number, required: false },
  For__time: { type: String, required: true },
  Capital_span: { type: String, default: "Included" },
  min_amount: { type: Number, required: false },
  max_amount: { type: Number, required: false },
  Details: { type: String, required: false }, // ✅ New field
  package_genarative_secret: { type: String, required: true },
  start_date: { type: Date, required: false, default: Date.now },
  end_date: { type: Date, required: false },
  next_profit_due: { type: Date, required: false },
});

const Package = mongoose.model("Package_Info", packageSchema);

module.exports = Package;
