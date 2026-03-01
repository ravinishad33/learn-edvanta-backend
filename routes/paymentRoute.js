const express = require("express");
const { verifyToken } = require("../middlewares/authMiddleware");
const { createPaymentOrder, verifyPayment } = require("../controllers/paymentController");

const router = express.Router();

// Create order (user must be logged in)
router.post("/create-order", verifyToken, createPaymentOrder);

// Verify payment after checkout
router.post("/verify-payment", verifyToken, verifyPayment);

module.exports = router;