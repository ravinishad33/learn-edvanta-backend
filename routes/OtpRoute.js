const express = require("express");
const { sendOtpController, verifyOtpController, sendRegisterOtp, verifyRegisterOtp } = require("../controllers/otpController");
const router = express.Router();

router.post("/send-otp", sendOtpController);
router.post("/verify-otp", verifyOtpController);
router.post("/send-register-otp", sendRegisterOtp);
router.post("/verify-register-otp", verifyRegisterOtp);


module.exports = router;
