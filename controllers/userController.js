const { User } = require("../models/userModel");
const fs = require("fs");
const { uploadOnCloudinary } = require("../utils/cloudinary")
const Course =require("../models/courseModel")
const Enrollment =require("../models/enrollmentModel")


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







const getVirtualNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role; // student, instructor, or admin

    let notifications = [];

    if (userRole === "instructor") {
      // 1. Get Instructor's Courses
      const myCourses = await Course.find({ instructor: userId }).select("_id title reviews");
      const myCourseIds = myCourses.map((c) => c._id);

      // 2. Fetch Recent Enrollments (using Enrollment model)
      const recentEnrollments = await Enrollment.find({ courseId: { $in: myCourseIds } })
        .populate("studentId", "name avatar")
        .sort({ createdAt: -1 })
        .limit(10);

      // 3. Format Enrollment Notifications
      const enrollmentNotifs = recentEnrollments.map((enrol) => ({
        id: enrol._id,
        text: `${enrol.studentId?.name || "A student"} enrolled in your course: ${enrol.courseId?.title || "Course"}`,
        time: enrol.createdAt,
        type: "enrollment",
        read: false,
      }));

      // 4. Extract Review Notifications from Course sub-documents
      // We flatten the reviews array from all courses owned by this instructor
      const reviewNotifs = myCourses.flatMap((course) =>
        course.reviews.map((rev) => ({
          id: rev._id,
          text: `New ${rev.rating}-star review on ${course.title}`,
          time: rev.createdAt,
          type: "review",
          read: false,
        }))
      );

      notifications = [...enrollmentNotifs, ...reviewNotifs];

    } else if (userRole === "student") {
      // 1. Get recently published courses (General updates for students)
      const newCourses = await Course.find({ status: "published" })
        .sort({ createdAt: -1 })
        .limit(10)
        .select("title createdAt");

      notifications = newCourses.map((course) => ({
        id: course._id,
        text: `New course available: ${course.title}. Start learning today!`,
        time: course.createdAt,
        type: "course_update",
        read: false,
      }));
    }

    // Sort combined notifications by newest first
    const sortedNotifications = notifications
      .sort((a, b) => new Date(b.time) - new Date(a.time))
      .slice(0, 15) // Limit to top 15 for performance
      .map(n => ({
        ...n,
        // Match your requested format: dd:mm:yy hh:mm:ss
        // Example: 15:03:26 15:34:32
        time: new Date(n.time).toLocaleString('en-GB', {
          day: '2-digit',
          month: '2-digit',
          year: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        }).replace(/\//g, ':').replace(',', '')
      }));

    res.status(200).json({
      success: true,
      data: sortedNotifications,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getVirtualNotifications };




module.exports = {
  updateProfile,
  updateAvatar,
  getVirtualNotifications
}