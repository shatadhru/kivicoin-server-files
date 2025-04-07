const express = require("express");
const router = express.Router();
const axios = require("axios");
require("dotenv").config();

const API_KEY = process.env.NOWPAYMENTS_API_KEY2;
const AUTH_TOKEN = process.env.NOWPAYMENTS_AUTH_TOKEN; // If you have one

console.log("Now Payment API Key: ", API_KEY);

// Get account balance
router.get("/balance", async (req, res) => {
  const config = {
    method: "get",
    maxBodyLength: Infinity,
    url: "https://api.nowpayments.io/v1/balance",
    headers: {
      "x-api-key": API_KEY,
      "Content-Type": "application/json",
    },
  };

  try {
    const response = await axios(config);
    res.json(response.data);
    console.log(response);
  } catch (error) {
    console.error(error.response?.data || error.message);
    res.status(500).json({
      error: error.response?.data?.message || "Failed to fetch balance",
    });
  }
});

// Validate payout address
router.post("/validate-address", async (req, res) => {
  const { address, currency, extra_id = null } = req.body;

  const data = JSON.stringify({ address, currency, extra_id });

  const config = {
    method: "post",
    maxBodyLength: Infinity,
    url: "https://api.nowpayments.io/v1/payout/validate-address",
    headers: {
      "x-api-key": API_KEY,
      "Content-Type": "application/json",
    },
    data,
  };

  try {
    const response = await axios(config);
    res.json(response.data);
  } catch (error) {
    console.error(error.response?.data || error.message);
    res
      .status(400)
      .json(error.response?.data || { error: "Validation failed" });
  }
});

// Create payout
router.post("/payout", async (req, res) => {
  const { withdrawals, ipn_callback_url } = req.body;

  const data = JSON.stringify({
    ipn_callback_url: ipn_callback_url || "https://nowpayments.io",
    withdrawals,
  });

  const config = {
    method: "post",
    maxBodyLength: Infinity,
    url: "https://api.nowpayments.io/v1/payout",
    headers: {
      Authorization: `Bearer ${AUTH_TOKEN}`,
      "x-api-key": API_KEY,
      "Content-Type": "application/json",
    },
    data,
  };

  try {
    const response = await axios(config);
    res.json(response.data);
  } catch (error) {
    console.error(error.response?.data || error.message);
    res.status(400).json(error.response?.data || { error: "Payout failed" });
  }
});

// Verify a payout
router.post("/payout/:payout_id/verify", async (req, res) => {
  const { payout_id } = req.params;
  const { verification_code } = req.body;

  const data = JSON.stringify({ verification_code });

  const config = {
    method: "post",
    maxBodyLength: Infinity,
    url: `https://api.nowpayments.io/v1/payout/${payout_id}/verify`,
    headers: {
      Authorization: `Bearer ${AUTH_TOKEN}`,
      "x-api-key": API_KEY,
      "Content-Type": "application/json",
    },
    data,
  };

  try {
    const response = await axios(config);
    res.json(response.data);
  } catch (error) {
    console.error(error.response?.data || error.message);
    res
      .status(400)
      .json(error.response?.data || { error: "Verification failed" });
  }
});

// Get a specific payout by ID
router.get("/payout/:payout_id", async (req, res) => {
  const { payout_id } = req.params;

  const config = {
    method: "get",
    maxBodyLength: Infinity,
    url: `https://api.nowpayments.io/v1/payout/${payout_id}`,
    headers: {
      "x-api-key": API_KEY,
    },
  };

  try {
    const response = await axios(config);
    res.json(response.data);
  } catch (error) {
    console.error(error.response?.data || error.message);
    res.status(500).json({
      error: error.response?.data?.message || "Failed to fetch payout details",
    });
  }
});

// Get payout history
router.get("/payout-history", async (req, res) => {
  const config = {
    method: "get",
    maxBodyLength: Infinity,
    url: "https://api.nowpayments.io/v1/payout",
    headers: {
      "x-api-key": API_KEY,
      "Content-Type": "application/json",
    },
  };

  try {
    const response = await axios(config);
    res.json(response.data);
  } catch (error) {
    console.error(error.response?.data || error.message);
    res.status(500).json({
      error: error.response?.data?.message || "Failed to fetch payout history",
    });
  }
});

module.exports = router;
