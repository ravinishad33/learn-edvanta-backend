const { User } = require("../models/userModel");
const { hashPassword } = require("../utils/hashPassword")
const { comparePassword } = require("../utils/comparePassword");
const { generateToken } = require("../utils/generateToken");
const bcrypt = require("bcryptjs")
const axios = require("axios");
const { sendPasswordResetSuccessEmail } = require("../services/emailService");
const { getDeviceInfo } = require("../utils/deviceInfo");
const { getLocationFromIP } = require("../utils/getLocationFromIP");
const otpStore = require("../utils/otpStore");



const register = async (req, res) => {
  try {
    const { name, email, phone, password, role } = req.body;

    // Check if OTP was verified
    const storedOtpData = otpStore.get(email);

    if (!storedOtpData || !storedOtpData.verified) {
      return res.status(400).json({
        success: false,
        message: "Please verify your email before registering",
      });
    }

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: "User already exists with this email",
      });
    }

    const hashedPassword = await hashPassword(password);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      phone,
      role: role || "student",
      isVerified: true, // 
    });

    // Delete OTP after successful registration
    otpStore.delete(email);

    res.status(201).json({
      success: true,
      message: "Registration successful.",
      user,
    });

  } catch (error) {
    console.log("registration failed!", error);
  }
};


const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if email and password exist
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Please provide email and password'
      });
    }
    // Check if user exists && password is correct
    const user = await User.findOne({ email }).select('+password');


    if (!user || user.password === undefined || !(await comparePassword(password, user.password))) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    user.lastLogin = new Date();
    await user.save();


    const token = await generateToken(user._id, user.role);
    res.status(201).json({
      success: true,
      message: 'Login successful.',
      token,
      user
    });
  } catch (error) {
    console.log("error During login ", error)
  }
}


const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId)
      .select("-password");
    res.status(200).json({
      success: true,
      user
    });

  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};









// update user password 
const updatePassword = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { currentPassword, newPassword, confirmPassword } = req.body;

    //  Basic validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "All password fields are required",
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "New password and confirm password do not match",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long",
      });
    }

    //  Get user with password
    const user = await User.findById(userId).select("+password");

    if (!user || !user.password) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check current password
    const isMatch = await bcrypt.compare(
      currentPassword,
      user.password
    );

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);

    await user.save();

    const { ipAddress, deviceName } = getDeviceInfo(req);
    const location = await getLocationFromIP(ipAddress);
    sendPasswordResetSuccessEmail(user, ipAddress, deviceName, location);

    res.status(200).json({
      success: true,
      message: "Password updated successfully",
    });
  } catch (error) {
    console.error("Update password error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

















// sync user from autho to mongoose 
const syncAuth0User = async (req, res) => {
  try {
    const accessToken = req.headers.authorization.split(" ")[1];

    const { data: profile } = await axios.get(
      `https://${process.env.AUTH0_DOMAIN}/userinfo`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    const auth0Id = profile.sub;
    const provider = auth0Id.split("|")[0];

    let user = await User.findOne({ auth0Id });

    if (!user) {
      // New user — create from Auth0
      user = await User.create({
        auth0Id,
        provider,
        name: profile.name || profile.nickname,
        email: profile.email,
        isVerified: profile.email_verified || false,
        avatar: { url: profile.picture, publicId: null },
        lastLogin: new Date(),
      });
    } else {
      // Existing user — only fill empty fields
      if (!user.name) user.name = profile.name || profile.nickname;
      if (!user.email) {
        user.email = profile.email;
        user.isVerified = profile.email_verified || false;
      }

      if (!user.avatar || !user.avatar.url) {
        user.avatar = { url: profile.picture, publicId: null };
      }

      user.lastLogin = new Date();
      await user.save();
    }

    const token = await generateToken(user._id, user.role);

    res.status(200).json({
      success: true,
      message: "Auth0 user synced successfully",
      user,
      token,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "User sync failed" });
  }
};


// reset password 

const resetPassword = async (req, res) => {
  try {
    const { email, newPassword, confirmPassword } = req.body;
    console.log(req.body)
    // 1. Validate input
    if (!email || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Passwords do not match",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });
    }

    // 2. Find user
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // 3. Hash password
    const hashedPassword = await hashPassword(newPassword);

    // 4. Update password
    user.password = hashedPassword;
    await user.save();




    const { ipAddress, deviceName } = getDeviceInfo(req);
    const location = await getLocationFromIP(ipAddress);

    sendPasswordResetSuccessEmail(user, ipAddress, deviceName, location);

    // 5. Success response
    res.status(200).json({
      success: true,
      message: "Password reset successfully",
    });
  } catch (error) {
    console.error("Reset password error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to reset password",
    });
  }
};





module.exports = { register, login, getMe, syncAuth0User, updatePassword, resetPassword };