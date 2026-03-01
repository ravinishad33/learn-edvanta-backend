const { User } = require("../models/userModel");
const fs = require("fs");
const { uploadOnCloudinary } = require("../utils/cloudinary")

const updateProfile = async (req, res) => {
  try {
    const userId = req.user.userId;

    const {
      name,
      phone,
      location,
      bio,
      linkedin,
      github,
      website,
      avatar,
      role
    } = req.body;

    // Build update object (only allowed fields)
    const updateData = {
      name,
      phone,
      location,
      bio,
      linkedin,
      github,
      website,
      avatar,
      role,
    };

    // Remove undefined fields
    Object.keys(updateData).forEach(
      (key) => updateData[key] === undefined && delete updateData[key]
    );

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select("-password");

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user: updatedUser,
    });

  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update profile",
    });
  }
};







// update user avatar profile 
const updateAvatar = async (req, res) => {
  try {
    const userId = req.user.userId;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Avatar image is required",
      });
    }

    // Upload to Cloudinary
    const result = await uploadOnCloudinary(
      req.file.path,
      "image",
      "users/avatars"
    );

    // Delete local file
    fs.unlinkSync(req.file.path);

    const avatar = {
      url: result.secure_url,
      publicId: result.public_id,
    };

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { avatar },
      { new: true, runValidators: true }
    ).select("-password");

    console.log("Updated user avatar:", updatedUser.avatar);

    res.status(200).json({
      success: true,
      message: "Avatar updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Avatar update error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};







module.exports = { updateProfile, updateAvatar }