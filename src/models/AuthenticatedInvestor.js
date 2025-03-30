const mongoose = require("mongoose");

const authenticate_investor = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  package_name: { type: String, required: true },
  package_genarative_secret: {type: String , required: true },
  package_price: {type: String , required: true },
  total_profit: {type: String , required: true },
  total_invest: {type: String , required: true },
  package_duration: {type: String , required: true },
  package_status: {type: String , required: true },
  package_start_date: {type: String , required: true },
  package_end_date: {type: String , required: true },
  discount: {type: String , required: true },
  is_Authorised: {type: String , required: true },

 
  
  
});

module.exports = mongoose.model("Packages", authenticate_investor);
