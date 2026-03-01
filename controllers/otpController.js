const generateOtp = require("../utils/generateOTP");
const { User } = require("../models/userModel");
const { sendOtpEmail, sendFailedOtpEmail, sendEmailVerificationOtp } = require("../services/emailService")

const otpStore = require("../utils/otpStore");
const { getDeviceInfo } = require("../utils/deviceInfo");
const { getLocationFromIP } = require("../utils/getLocationFromIP");




const sendOtpController = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }



    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found with this email",
      });
    }


    const otp = generateOtp();

    otpStore.set(email, {
      otp,
      expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes
    });

    const mail = sendOtpEmail(user, otp);

    res.status(200).json({
      success: true,
      message: "OTP sent successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to send OTP",
    });
  }
};



const verifyOtpController = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: "Email and OTP are required",
      });
    }


    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }





    const storedOtpData = otpStore.get(email);
    // console.log(storedOtpData)

    if (!storedOtpData) {
      return res.status(400).json({
        success: false,
        message: "OTP not found or already used",
      });
    }

    if (storedOtpData.expiresAt < Date.now()) {
      otpStore.delete(email);
      return res.status(400).json({
        success: false,
        message: "OTP expired",
      });
    }



    storedOtpData.attempt = storedOtpData.attempt || 0;
    if (storedOtpData.otp !== otp) {
      storedOtpData.attempt += 1;
      otpStore.set(email, storedOtpData);

      // sending security email to user
      if (storedOtpData.attempt >= 3) {

        // getting device info 
        const { ipAddress, deviceName } = getDeviceInfo(req);
        const location = await getLocationFromIP(ipAddress);

        sendFailedOtpEmail(user, storedOtpData.attempt, ipAddress, deviceName, location);
      }

      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }



    // OTP verified remove it
    otpStore.delete(email);

    res.status(200).json({
      success: true,
      message: "OTP verified successfully",
    });
  } catch (error) {
    console.error("Verify OTP error:", error);

    res.status(500).json({
      success: false,
      message: "OTP verification failed",
    });
  }
};








const sendRegisterOtp = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    // If user already exists and verified → block
    const existingUser = await User.findOne({ email });

    if (existingUser && existingUser.isVerified) {
      return res.status(400).json({
        success: false,
        message: "Email already registered and verified",
      });
    }

    const otp = generateOtp();

    // Store OTP in memory (5 min expiry)
    otpStore.set(email, {
      otp,
      expiresAt: Date.now() + 5 * 60 * 1000,
      verified: false,
    });

    await sendEmailVerificationOtp(email, otp);

    res.status(200).json({
      success: true,
      message: "Verification OTP sent successfully",
    });

  } catch (error) {
    console.error("Send Register OTP Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to send verification OTP",
    });
  }
};





const verifyRegisterOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: "Email and OTP are required",
      });
    }

    const storedOtpData = otpStore.get(email);

    if (!storedOtpData) {
      return res.status(400).json({
        success: false,
        message: "OTP not found or already used",
      });
    }

    if (storedOtpData.expiresAt < Date.now()) {
      otpStore.delete(email);
      return res.status(400).json({
        success: false,
        message: "OTP expired",
      });
    }

    if (storedOtpData.otp !== otp) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    // Mark as verified (DO NOT delete yet)
    storedOtpData.verified = true;
    otpStore.set(email, storedOtpData);

    res.status(200).json({
      success: true,
      message: "Email verified successfully",
    });

  } catch (error) {
    console.error("Verify Register OTP error:", error);
    res.status(500).json({
      success: false,
      message: "OTP verification failed",
    });
  }
};


module.exports = {
  sendOtpController,
  verifyOtpController,
  sendRegisterOtp,
  verifyRegisterOtp
};
