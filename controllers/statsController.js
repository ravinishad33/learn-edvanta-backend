const { User } = require("../models/userModel");
const Course = require("../models/courseModel");
const Certificate = require("../models/certificateModel");

/**
 * @desc    Get Public Platform Statistics
 * @route   GET /api/public/platform-stats
 * @access  Public (No Login Required)
 */
const getPublicStats = async (req, res) => {
  try {
    // We add totalInstructors to the concurrent count process
    const [totalStudents, totalInstructors, totalCourses, totalCertificates] = await Promise.all([
      User.countDocuments({ role: "student" }),
      User.countDocuments({ role: "instructor" }), // New: Count users with instructor role
      Course.countDocuments({ status: "published" }), 
      Certificate.countDocuments(),
    ]);

    res.status(200).json({
      success: true,
      data: {
        students: totalStudents,
        instructors: totalInstructors, // Added to the response
        courses: totalCourses,
        certificates: totalCertificates,
      },
    });
  } catch (error) {
    console.error("Error fetching public stats:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching platform metrics",
    });
  }
};

module.exports = { getPublicStats };