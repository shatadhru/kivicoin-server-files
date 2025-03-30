const mongoose = require("mongoose");

const payment_schema = new mongoose.Schema(
  {
    Order_ID: { type: String, required: true }, // Order ID associated with the payment
    status: { type: String, required: true }, // Payment status (paid, pending, failed)
    price_amount: { type: String, required: true }, // Amount paid
    price_currency: { type: String, required: true }, // Currency used for the payment
    pay_currency: { type: String, required: true }, // Cryptocurrency used for payment (if applicable)
    payment_amount: { type: String, required: true }, // Amount in the pay_currency
    payment_status: { type: String, required: true }, // Status of the payment (completed, pending)
    transaction_id: { type: String, required: true }, // Unique transaction ID
    datetime: { type: Date, required: true }, // Date and time of the payment
    ipn_version: { type: String, required: true }, // IPN version
    buyer_email: { type: String, required: true }, // Email of the buyer
    buyer_name: { type: String, required: true }, // Name of the buyer
    fee: { type: String, required: true }, // Transaction fee, if applicable
  },
  { timestamps: true }
); // Automatically adds createdAt and updatedAt fields

module.exports = mongoose.model("Payment", payment_schema);
