const express = require("express");
const { verifyToken } = require("../middlewares/authMiddleware");
const { createPaymentOrder, verifyPayment, getAllPayments } = require("../controllers/paymentController");
const { userRole } = require("../middlewares/roleMiddleware");

const router = express.Router();

// Create order (user must be logged in)
router.post("/create-order", verifyToken,userRole("student"), createPaymentOrder);

// Verify payment after checkout
router.post("/verify-payment", verifyToken, userRole("student"),verifyPayment);

router.get("/", verifyToken,userRole("admin"), getAllPayments);

module.exports = router;