const { User } = require("../models/userModel");
const fs = require("fs");
const { uploadOnCloudinary, deleteFromCloudinary } = require("../utils/cloudinary")
const Course = require("../models/courseModel")
const Enrollment = require("../models/enrollmentModel")
const Payment = require("../models/paymentModel");
const Certificate = require("../models/paymentModel");
const Discussion=require("../models/discussionModel")




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


    // Get old avatar publicId
    const user = await User.findById(userId);
    const oldPublicId = user?.avatar?.publicId;


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

    //Delete old avatar (after successful update)
    if (oldPublicId) {
      await deleteFromCloudinary(oldPublicId);
    }

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
        .limit(5);

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
        // formate: 15-03-26 15:34:32
        time: new Date(n.time).toLocaleString('en-GB', {
          day: '2-digit',
          month: '2-digit',
          year: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        }).replace(/\//g, '-').replace(',', '')
      }));

    res.status(200).json({
      success: true,
      data: sortedNotifications,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};




const deleteUser = async (req, res) => {
  try {
    const userId = req.user.userId;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Delete avatar
    if (user.avatar?.publicId) {
      await deleteFromCloudinary(user.avatar.publicId);
    }

    // Delete related data
    await Enrollment.deleteMany({ studentId: userId });
    await Payment.deleteMany({ student: userId });
    await Certificate.deleteMany({ student: userId });

    // Remove user from courses
    await Course.updateMany(
      { enrolledStudents: userId },
      { $pull: { enrolledStudents: userId } }
    );

    // Remove reviews
    await Course.updateMany(
      { "reviews.student": userId },
      { $pull: { reviews: { student: userId } } }
    );

    // Delete discussions created by user
    await Discussion.deleteMany({ user: userId });

    // Remove user upvotes from discussions
    await Discussion.updateMany(
      { upvotes: userId },
      { $pull: { upvotes: userId } }
    );

    // If instructor → delete their courses
    await Course.deleteMany({ instructor: userId });

    // Delete user
    await User.findByIdAndDelete(userId);

    res.json({
      success: true,
      message: "User deleted successfully",
    });

  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "Error deleting user",
    });
  }
};


module.exports = {
  updateProfile,
  updateAvatar,
  getVirtualNotifications,
  deleteUser
}