const mongoose = require("mongoose");
const Course = require("../models/courseModel");


const getInstructorStats = async (req, res) => {
  try {
    const instructorId = req.user.userId;

    if (!mongoose.Types.ObjectId.isValid(instructorId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid instructor ID",
      });
    }

    const now = new Date();
    const startThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    // Fetch all courses by this instructor
    const courses = await Course.find({ instructor: instructorId })
      .populate("enrolledStudents", "_id")
      .lean();

    let totalCourses = courses.length;
    let totalPublished = 0;
    let totalStudents = 0;
    let totalRevenue = 0;
    let thisMonthCourses = 0;
    let lastMonthCourses = 0;
    let thisMonthStudents = 0;
    let lastMonthStudents = 0;
    let thisMonthRevenue = 0;
    let lastMonthRevenue = 0;
    let ratingSum = 0;
    let ratingCount = 0;

    courses.forEach((course) => {
      const studentsCount = course.enrolledStudents?.length || 0;
      const finalPrice = (course.price || 0) - (course.discountPrice || 0);
      const revenue = finalPrice * studentsCount;

      totalStudents += studentsCount;
      totalRevenue += revenue;

      if (course.visibility === "public") totalPublished++;

      // This month
      if (course.createdAt >= startThisMonth) {
        thisMonthCourses++;
        thisMonthStudents += studentsCount;
        thisMonthRevenue += revenue;
      }

      // Last month
      if (course.createdAt >= startLastMonth && course.createdAt < startThisMonth) {
        lastMonthCourses++;
        lastMonthStudents += studentsCount;
        lastMonthRevenue += revenue;
      }

      if (course.averageRating) {
        ratingSum += course.averageRating;
        ratingCount++;
      }
    });

    // Growth calculations
    const courseGrowth = thisMonthCourses - lastMonthCourses;
    const studentGrowth = thisMonthStudents - lastMonthStudents;
    const revenueGrowthPercent =
      lastMonthRevenue > 0
        ? (((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100).toFixed(1)
        : 0;
    const thisMonthRevenuePercent =
      totalRevenue > 0 ? ((thisMonthRevenue / totalRevenue) * 100).toFixed(1) : 0;
    const avgRating = ratingCount > 0 ? (ratingSum / ratingCount).toFixed(1) : "0";
    const ratingGrowth = "0.0";

    res.status(200).json({
      success: true,
      stats: {
        totalCourses,
        totalPublished,
        courseGrowth,
        totalStudents,
        studentGrowth,
        totalRevenue,
        thisMonthRevenue,
        revenueGrowthPercent: `${revenueGrowthPercent}`,
        thisMonthRevenuePercent: `${thisMonthRevenuePercent}%`,
        avgRating,
        ratingGrowth,
      },
    });
  } catch (error) {
    console.error("Get instructor stats error:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};




module.exports = { getInstructorStats };