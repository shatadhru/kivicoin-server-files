const mongoose = require('mongoose');

const RecentActivity = new mongoose.Schema({
  email: { type: String, required: true },
  activity_type: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});

const RecentActivityModels = mongoose.model("RecentActivity", RecentActivity);

module.exports = RecentActivityModels;