const mongoose = require("mongoose");

const packageSchema = new mongoose.Schema({
  Package_Name: { type: String, required: true },
  Order_ID: { type: String, required: true },
  Return_Persentage: { type: Number, required: true },
  To_Return_Persentage: { type: Number, required: true },
  Time_Every: { type: String, required: true },
  For__time: { type: String, required: true },
  Capital_span: { type: String, default: "Included" },
  price: { type: Number, required: true },
  package_genarative_secret: { type: String, required: true },
});

// Create Model
const Package = mongoose.model("Package_Info", packageSchema);

module.exports = Package;
