const mongoose = require("mongoose");
const Course = require("../models/courseModel");
const Enrollment = require("../models/enrollmentModel");
const Payment = require("../models/paymentModel")
const { User } = require("../models/userModel");
const Certificate = require("../models/certificateModel");
const Discussion=require("../models/discussionModel")
const { uploadOnCloudinary, deleteFromCloudinary } = require("../utils/cloudinary");
const fs = require("fs");
const os = require("os");
const { getAvgQueryTime, getCpuUsage } = require("../services/systemStatsService");
const { getPoolStats } = require("../config/db");
const { upsertSystemLog, removeSystemLog, getSystemLogs } = require("../services/systemLogs");


// GET /api/admin/stats
const getAdminStats = async (req, res) => {
  try {
    // Fetch all courses
    const courses = await Course.find().select(
      "price discountPrice visibility enrolledStudents"
    );

    // Fetch all enrollments
    const enrollments = await Enrollment.find().select("courseId studentId");

    // Total courses
    const totalCourses = courses.length;

    // Active courses = status === "published" or "public" visibility
    const activeCourses = courses.filter(
      (c) => c.visibility?.toLowerCase() === "public"
    ).length;

    // Total students in database
    const totalStudents = await User.countDocuments({ role: "student" });

    // Unique students who are enrolled in at least one course
    const uniqueEnrolledStudentIds = new Set(
      enrollments.map((e) => e.studentId.toString())
    );
    const totalEnrolledStudents = uniqueEnrolledStudentIds.size;

    // Total revenue = sum of enrolled courses' prices after discount
    const courseRevenueMap = {};
    courses.forEach((course) => {
      const price = Number(course.price) || 0;
      const discount = Number(course.discountPrice) || 0;
      courseRevenueMap[course._id.toString()] = price - discount;
    });

    const totalRevenue = enrollments.reduce((sum, e) => {
      return sum + (courseRevenueMap[e.courseId.toString()] || 0);
    }, 0);

    const totalRevenueRounded = Number(totalRevenue.toFixed(2));

    res.status(200).json({
      success: true,
      stats: {
        totalCourses,
        activeCourses,
        totalStudents,          // all students in DB
        totalEnrolledStudents,  // students who enrolled
        totalRevenue: totalRevenueRounded,
      },
    });
  } catch (error) {
    console.error("Get admin stats error:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};







// GET /api/admin/users
const getAllUsers = async (req, res) => {
  try {

    const users = await User.find().select("-password");

    res.status(200).json({
      success: true,
      count: users.length,
      users
    });

  } catch (error) {
    console.error("Get all users error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};



// delete user by id 
const deleteUser = async (req, res) => {
  try {
    const userId = req.params.id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Delete avatar (Cloudinary)
    if (user.avatar?.publicId) {
      await deleteFromCloudinary(user.avatar.publicId);
    }

    // Delete enrollments
    await Enrollment.deleteMany({ studentId: userId });

    // Delete payments
    await Payment.deleteMany({ student: userId });

    // Delete certificates
    await Certificate.deleteMany({ student: userId });

    // Remove user from enrolled courses
    await Course.updateMany(
      { enrolledStudents: userId },
      { $pull: { enrolledStudents: userId } }
    );

    // Remove reviews given by user
    await Course.updateMany(
      { "reviews.student": userId },
      { $pull: { reviews: { student: userId } } }
    );

    // Delete discussions created by user
    await Discussion.deleteMany({ user: userId });

    //  Remove user upvotes from discussions
    await Discussion.updateMany(
      { upvotes: userId },
      { $pull: { upvotes: userId } }
    );

    // Delete courses created by user (if instructor)
    await Course.deleteMany({ instructor: userId });

    // Finally delete user
    await User.findByIdAndDelete(userId);

    res.json({
      success: true,
      message: "User and all related data deleted successfully",
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Deletion failed",
    });
  }
};

// GET /api/admin/users/:id
const getUserById = async (req, res) => {
  try {

    const user = await User.findById(req.params.id).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      user,
    });

  } catch (error) {
    console.error("Get user error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};








// PUT /api/admin/users/:id
const updateUserByAdmin = async (req, res) => {
  try {

    const { name, email, phone, role, status, location, bio, language } = req.body;

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Update allowed fields only
    user.name = name ?? user.name;
    user.email = email ?? user.email;
    user.phone = phone ?? user.phone;
    user.role = role ?? user.role;
    user.status = status ?? user.status;

    user.location = location ?? user.location;
    user.bio = bio ?? user.bio;
    user.language = bio ?? user.language;




    const updatedUser = await user.save();

    res.status(200).json({
      success: true,
      message: "User updated successfully",
      data: {
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        status: updatedUser.status,
      },
    });

  } catch (error) {
    console.error("Update user error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};







// update user avatar profile by admin
const updateAvatarByAdmin = async (req, res) => {
  try {
    const userId = req.params.id;
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



// getting top 5 courses 
const getTopPerformingCourses = async (req, res) => {
  try {
    const courses = await Course.aggregate([
      {
        $addFields: {
          totalStudents: { $size: "$enrolledStudents" },

          revenue: {
            $multiply: [
              { $ifNull: ["$price", 0] },
              { $size: "$enrolledStudents" }
            ]
          },

          //stored rating
          avgRating: { $ifNull: ["$averageRating", 0] },
          totalRatings: { $ifNull: ["$totalRatings", 0] }
        },
      },

      { $sort: { revenue: -1 } },
      { $limit: 5 },

      {
        $project: {
          title: 1,
          price: 1,
          avgRating: { $round: ["$avgRating", 1] },
          totalRatings: 1,
          totalStudents: 1,
          revenue: 1,
        },
      },
    ]);

    res.status(200).json({
      success: true,
      count: courses.length,
      data: courses,
    });

  } catch (error) {
    console.error("Top courses error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};












const getCourseDistributionByCategory = async (req, res) => {
  try {
    const distribution = await Course.aggregate([
      {
        $lookup: {
          from: "categories", // collection name in MongoDB
          localField: "category",
          foreignField: "_id",
          as: "categoryDetails",
        },
      },
      {
        $unwind: {
          path: "$categoryDetails",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $group: {
          _id: "$categoryDetails.name", // group by category name
          count: { $sum: 1 },
        },
      },
      {
        $sort: { count: -1 },
      },
    ]);

    res.status(200).json({
      success: true,
      data: distribution,
    });

  } catch (error) {
    console.error("Category distribution error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};











// GET /api/admin/chart-stats
const getAdminChartData = async (req, res) => {
  try {
    // Monthly Revenue
    const revenueData = await Enrollment.aggregate([
      // Join Course to get price and discount
      {
        $lookup: {
          from: "courses",
          localField: "courseId",
          foreignField: "_id",
          as: "course",
        },
      },
      { $unwind: "$course" },

      // Calculate actual paid amount = price - discountPrice
      {
        $addFields: {
          paidAmount: {
            $subtract: [
              { $ifNull: ["$course.price", 0] },
              { $ifNull: ["$course.discountPrice", 0] },
            ],
          },
        },
      },

      // Group by month
      {
        $group: {
          _id: { $month: "$createdAt" }, // month number 1-12
          totalRevenue: { $sum: "$paidAmount" },
        },
      },

      { $sort: { "_id": 1 } },
    ]);

    // Monthly User Growth (same as before)
    const userGrowthData = await User.aggregate([
      {
        $group: {
          _id: { $month: "$createdAt" },
          newUsers: { $sum: 1 },
        },
      },
      { $sort: { "_id": 1 } },
    ]);

    // Ensure all months exist
    const fillMonths = (data, field) => {
      const fullData = [];
      for (let month = 1; month <= 12; month++) {
        const existing = data.find((d) => d._id === month);
        fullData.push({
          _id: month,
          [field]: existing ? existing[field] : 0,
        });
      }
      return fullData;
    };

    const revenueFull = fillMonths(revenueData, "totalRevenue");
    const usersFull = fillMonths(userGrowthData, "newUsers");

    res.status(200).json({
      success: true,
      data: {
        revenueData: revenueFull,
        userGrowthData: usersFull,
      },
    });
  } catch (error) {
    console.error("Chart data error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};







// admin overview details 
const getAdminDashboardStats = async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = startOfMonth;


    const last30Days = new Date(
  Date.now() - 30 * 24 * 60 * 60 * 1000
);
   

    // Users
    const totalUsers = await User.countDocuments();
 const activeUsers = await User.countDocuments({
  lastLogin: { $gte: last30Days },
});
    
    const newUsersThisMonth = await User.countDocuments({ createdAt: { $gte: startOfMonth } });
    const lastMonthUsers = await User.countDocuments({ createdAt: { $gte: startOfLastMonth, $lt: endOfLastMonth } });
    const userGrowthPercent = lastMonthUsers
      ? (((newUsersThisMonth - lastMonthUsers) / lastMonthUsers) * 100).toFixed(1)
      : 0;

    // Courses
    const totalCourses = await Course.countDocuments();
    const publishedCourses = await Course.countDocuments({ visibility: "public" });
    const draftCourses = await Course.countDocuments({ visibility: "draft" });
    const pendingApprovalCourses = await Course.countDocuments({ status: "review" });
    const lastMonthCourses = await Course.countDocuments({
      createdAt: { $gte: startOfLastMonth, $lt: endOfLastMonth },
    });
    const courseGrowthPercent = lastMonthCourses
      ? (((totalCourses - lastMonthCourses) / lastMonthCourses) * 100).toFixed(1)
      : 0;

    // Revenue
    // Aggregate revenue from enrollments with course prices
    const enrollments = await Enrollment.find().populate("courseId", "price discountPrice");
    let totalRevenue = 0;
    let thisMonthRevenue = 0;
    let lastMonthRevenue = 0;

    enrollments.forEach((e) => {
      const price = Number(e.courseId?.price || 0);
      const discount = Number(e.courseId?.discountPrice || 0);
      const finalPrice = price - discount;
      totalRevenue += finalPrice;

      if (e.createdAt >= startOfMonth) thisMonthRevenue += finalPrice;
      if (e.createdAt >= startOfLastMonth && e.createdAt < endOfLastMonth) lastMonthRevenue += finalPrice;
    });

    const revenueGrowthPercent = lastMonthRevenue
      ? (((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100).toFixed(1)
      : 0;

    // Ratings
    const courseAgg = await Course.aggregate([
      {
        $group: {
          _id: null,
          totalRatingSum: {
            $sum: { $multiply: ["$averageRating", "$totalRatings"] }
          },
          totalRatings: { $sum: "$totalRatings" }
        }
      }
    ]);

    const avgRating = courseAgg[0]?.totalRatings
      ? (courseAgg[0].totalRatingSum / courseAgg[0].totalRatings).toFixed(1)
      : 0;

    const totalReviews = courseAgg[0]?.totalRatings || 0;



    // const totalReviews = courseAgg[0]?.totalReviews || 0;

    const lastMonthRatingAgg = await Course.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfLastMonth, $lt: endOfLastMonth }
        }
      },
      {
        $group: {
          _id: null,
          totalReviews: { $sum: "$totalRatings" }
        }
      }
    ]);

    const lastMonthTotalReviews =
      lastMonthRatingAgg[0]?.totalReviews || 0;

    const ratingGrowthPercent = lastMonthTotalReviews
      ? (
        ((totalReviews - lastMonthTotalReviews) /
          lastMonthTotalReviews) *
        100
      ).toFixed(1)
      : 0;




    //Pending approvals 
    const pendingCourses = await Course.countDocuments({ status: "review" });
    const pendingInstructors = await User.countDocuments({ role: "instructor", status: "pending" });

    const prevPendingCourses = await Course.countDocuments({
      status: "review",
      createdAt: { $gte: startOfLastMonth, $lt: endOfLastMonth },
    });
    const prevPendingInstructors = await User.countDocuments({
      role: "instructor",
      status: "pending",
      createdAt: { $gte: startOfLastMonth, $lt: endOfLastMonth },
    });

    const totalPendingNow = pendingCourses + pendingInstructors;
    const totalPendingPrev = prevPendingCourses + prevPendingInstructors;
    const pendingGrowthPercent = totalPendingPrev
      ? (((totalPendingNow - totalPendingPrev) / totalPendingPrev) * 100).toFixed(1)
      : 0;





    // system health
    const uptimeSeconds = process.uptime(); // total seconds server running
    const days = Math.floor(uptimeSeconds / 86400);
    const hours = Math.floor((uptimeSeconds % 86400) / 3600);
    const minutes = Math.floor((uptimeSeconds % 3600) / 60);

    // Formatted uptime
    const formattedUptime = `${days}d ${hours}h ${minutes}m`;

    // Health percent
    const standardPeriodSeconds = 30 * 86400; // 30 days in seconds
    const healthPercent = Math.min(((uptimeSeconds / standardPeriodSeconds) * 100).toFixed(1), 100);


    let previousUptimePercent = 0;
    const healthGrowthPercent = (healthPercent - previousUptimePercent).toFixed(1);




    res.status(200).json({
      success: true,
      data: {
        users: {
          total: totalUsers,
          active: activeUsers,
          newThisMonth: newUsersThisMonth,
          growthPercent: userGrowthPercent,
        },
        courses: {
          total: totalCourses,
          published: publishedCourses,
          draft: draftCourses,
          pendingApproval: pendingApprovalCourses,
          growthPercent: courseGrowthPercent,
          avgRating,
        },
        revenue: {
          total: totalRevenue.toFixed(2),
          thisMonth: thisMonthRevenue.toFixed(2),
          growthPercent: revenueGrowthPercent,
        },
        rating: {
          avgRating,
          totalReviews,
          growthPercent: ratingGrowthPercent,
        },
        pendingApprovals: {
          pendingApprovals: totalPendingNow,
          growthPercent: pendingGrowthPercent,
          courses: pendingCourses,
          instructors: pendingInstructors,
        },
        systemHealth: {
          uptime: formattedUptime,
          percent: healthPercent,
          healthGrowthPercent
        },
      },
    });
  } catch (error) {
    console.error("Admin dashboard stats error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};











// GET /api/admin/reports
const getPlatformReports = async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);

    // Fetch all courses with enrolled students
    const courses = await Course.find({}, "price discountPrice enrolledStudents createdAt").lean();

    let totalRevenue = 0;
    let thisMonthRevenue = 0;
    let monthlyCourseSales = 0;

    courses.forEach(course => {
      const price = Number(course.price || 0);
      const discount = Number(course.discountPrice || 0);
      const finalPrice = price - discount;
      const enrolledCount = course.enrolledStudents?.length || 0;

      // Total revenue for all time
      totalRevenue += finalPrice * enrolledCount;

      // Revenue for current month (students enrolled this month)
      // If you track enrollment date inside enrolledStudents, you can filter by that
      // For simplicity, assume course created this month counts
      if (course.createdAt >= startOfMonth) {
        thisMonthRevenue += finalPrice * enrolledCount;
        monthlyCourseSales += enrolledCount;
      }
    });


    
    // --- Total Users ---
    const totalUsers = await User.countDocuments({});
    const activeUsers = await User.countDocuments({ lastLogin: { $gte: last30Days } });
    const userRetention = totalUsers ? ((activeUsers / totalUsers) * 100).toFixed(1) : 0;

    // --- Average Satisfaction ---
    const avgRatingAgg = await Course.aggregate([
      { $group: { _id: null, avgRating: { $avg: "$averageRating" } } },
    ]);
    const avgSatisfaction = avgRatingAgg[0]?.avgRating?.toFixed(1) || 0;

    // --- Refund Rate (example using course creation this month) ---
    const refundedCount = await Enrollment.countDocuments({ status: "refunded", createdAt: { $gte: startOfMonth } });
    const refundRate = monthlyCourseSales ? ((refundedCount / monthlyCourseSales) * 100).toFixed(1) : 0;

    // --- Course Completion Rate ---
    const completedEnrollments = await Enrollment.countDocuments({ status: "completed" });
    const totalEnrollments = await Enrollment.countDocuments();
    const completionRate = totalEnrollments ? ((completedEnrollments / totalEnrollments) * 100).toFixed(1) : 0;

    // --- Average Session Time ---
    const avgSessionAgg = await Enrollment.aggregate([
      { $group: { _id: null, avgSession: { $avg: "$sessionDuration" } } },
    ]);
    const avgSessionTime = avgSessionAgg[0]?.avgSession?.toFixed(1) || 0;

    // --- System Health ---
    const uptimeSeconds = process.uptime();
    const days = Math.floor(uptimeSeconds / 86400);
    const hours = Math.floor((uptimeSeconds % 86400) / 3600);
    const minutes = Math.floor((uptimeSeconds % 3600) / 60);
    const formattedUptime = `${days}d ${hours}h ${minutes}m`;
    const standardPeriodSeconds = 30 * 86400;
    const healthPercent = Math.min(((uptimeSeconds / standardPeriodSeconds) * 100).toFixed(1), 100);

    const systemHealth = {
      uptime: formattedUptime,
      healthPercent: Number(healthPercent),
      growthPercent: null,
    };

    res.status(200).json({
      success: true,
      data: {
        platformReports: {
          totalRevenue: totalRevenue.toFixed(2),
          monthlyRevenue: thisMonthRevenue.toFixed(2),
          totalUsers,
          activeUsers,
          userRetention: `${userRetention}%`,
          avgSatisfaction,
        },
        financialReports: {
          monthlyRevenue: thisMonthRevenue.toFixed(2),
          courseSales: monthlyCourseSales,
          refundRate: `${refundRate}%`,
        },
        userEngagement: {
          completionRate: `${completionRate}%`,
          avgSessionTime: `${avgSessionTime} min`,
        },
        systemHealth,
      },
    });
  } catch (error) {
    console.error("Platform reports error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};





// GET /api/admin/system-status
const getSystemStatus = async (req, res) => {
  try {
    // --- Database Status ---
    const db = mongoose.connection;
    const dbStatus = db.readyState === 1 ? "Connected" : "Disconnected";

    // Connection pool info (from Mongoose connection)
    const poolStats = getPoolStats();

    // --- Query Performance 
    const { avgQueryTime, queryTimePercent } = getAvgQueryTime();


    // --- Server Resources ---
    const cpuUsage = await getCpuUsage(200);
    // const cpuUsage = Math.round(os.loadavg()[0] / os.cpus().length * 100); // 1 min load avg %
    const totalMemory = os.totalmem() / (1024 * 1024 * 1024); // GB
    const usedMemory = (os.totalmem() - os.freemem()) / (1024 * 1024 * 1024); // GB
    const memoryPercent = ((usedMemory / totalMemory) * 100).toFixed(1);

    // console.log(cpu)







    // --- System Logs ---
    const CPU_ALERT = "High CPU usage detected";
    const POOL_ALERT = "Database pool nearly full";
    const SLOW_QUERY_ALERT = "Very slow database queries detected";
    const MEDIUM_QUERY_ALERT = "Database response time is slow";

    // CPU (use realistic threshold)
    if (cpuUsage > 80) {
      upsertSystemLog(CPU_ALERT);
    } else {
      removeSystemLog(CPU_ALERT);
    }

    // Database Pool
    if (poolStats.poolPercent > 80) {
      upsertSystemLog(POOL_ALERT);
    } else {
      removeSystemLog(POOL_ALERT);
    }

    // Query Performance
    if (avgQueryTime > 1000) {
      upsertSystemLog(SLOW_QUERY_ALERT);
      removeSystemLog(MEDIUM_QUERY_ALERT);
    }
    else if (avgQueryTime > 500) {
      upsertSystemLog(MEDIUM_QUERY_ALERT);
      removeSystemLog(SLOW_QUERY_ALERT);
    }
    else {
      removeSystemLog(SLOW_QUERY_ALERT);
      removeSystemLog(MEDIUM_QUERY_ALERT);
    }
    const systemLogs = getSystemLogs();


    res.status(200).json({
      success: true,
      data: {
        databaseStatus: {
          status: dbStatus,
          connectionPool: `${poolStats.usedConnections}/${poolStats.maxPoolSize}`,
          poolPercent: `${poolStats.poolPercent}%`,
          avgQueryTime: `${avgQueryTime}ms avg`,
          queryTimePercent: `${queryTimePercent}%`
        },
        serverResources: {
          cpuUsage: `${cpuUsage}%`,
          memory: `${usedMemory.toFixed(1)}/${totalMemory.toFixed(1)} GB`,
          memoryPercent: `${memoryPercent}%`
        },
        systemLogs,
      },
    });
  } catch (error) {
    console.error("System status error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};








const getAdminCourses = async (req, res) => {
  try {
    // Fetch all courses with category and instructor populated
    const courses = await Course.find()
      .populate({ path: "category", select: "name" })
      .populate({ path: "instructor", select: "name email" })
      .select(
        "title price discountPrice visibility enrolledStudents totalLessons createdAt  averageRating totalRatings reviews  status thumbnail description"
      ); // Added 'status'


    // Fetch enrollments for all courses
    const enrollments = await Enrollment.find().select("courseId studentId");

    // Map each course to its stats
    const coursesWithStats = courses.map((course) => {
      const courseEnrollments = enrollments.filter(
        (e) => e.courseId.toString() === course._id.toString()
      );

      const enrolledCount = courseEnrollments.length;

      const price = Number(course.price) || 0;
      const discount = Number(course.discountPrice) || 0;

      const revenue = enrolledCount * (price - discount);

      return {
        _id: course._id,
        title: course.title,
        description:course.description,
        thumbnail: course.thumbnail,
        category: course.category?.name || "Uncategorized",
        instructor: course.instructor
          ? { name: course.instructor.name, email: course.instructor.email }
          : null,
        createdAt: course.createdAt,
        rating: course.averageRating || 0,
        visibility: course.visibility,
        status: course.status, // <-- Include status
        totalLessons: course.totalLessons,
        price,
        discountPrice: discount,
        enrolledStudents: enrolledCount,
        revenue: revenue.toFixed(2),
      };
    });

    res.status(200).json({
      success: true,
      courses: coursesWithStats,
    });
  } catch (error) {
    console.error("Get admin courses error:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};









// approve course 
const approveCourse = async (req, res) => {
  try {
    const { courseId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid course ID",
      });
    }

    const course = await Course.findById(courseId);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    // Only allow approval if course is in review
    if (course.status !== "review") {
      return res.status(400).json({
        success: false,
        message: "Only courses under review can be published",
      });
    }

    course.status = "published";
    await course.save();

    res.status(200).json({
      success: true,
      message: "Course published successfully",
      course,
    });

  } catch (error) {
    console.error("Publish course error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};


// reject course  
const rejectCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { reason } = req.body;

    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid course ID",
      });
    }

    const course = await Course.findById(courseId);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    if (course.status !== "review") {
      return res.status(400).json({
        success: false,
        message: "Only courses under review can be rejected",
      });
    }

    course.status = "rejected";
    course.rejectionReason = reason || "Not specified";
    await course.save();

    res.status(200).json({
      success: true,
      message: "Course rejected successfully",
      course,
    });

  } catch (error) {
    console.error("Reject course error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};







// GET /api/admin/pending-courses
const getPendingCourseApprovals = async (req, res) => {
  try {
    // Fetch courses with status "pending"
    const pendingCourses = await Course.find({ status: "review" })
      .populate("instructor", "name") // get instructor name
      .populate("category", "name")   // get category name
      .lean();

    // Map to desired format
    const courseApprovals = pendingCourses.map((course) => ({
      id: course._id,
      type: "course",
      title: course.title,
      instructor: course.instructor?.name || "Unknown",
      submitted: course.createdAt, // format as needed (e.g., "2 days ago")
      status: course.status,
      category: course.category?.name || "Uncategorized",
    }));

    res.status(200).json({
      success: true,
      count: courseApprovals.length,
      pendingApprovals: courseApprovals,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};







const getAdminRecentActivities = async (req, res) => {
  try {

    // recent enrollments
    const enrollments = await Enrollment.find()
      .populate("studentId", "name")
      .populate("courseId", "title")
      .sort({ createdAt: -1 })
      .limit(10);

    const enrollmentActivities = enrollments.map((e) => ({
      id: e._id,
      user: e.studentId?.name || "Student",
      action: "enrolled in course",
      course: e.courseId?.title || "",
      time: e.createdAt,
      type: "info",
      icon: "CreditCardIcon",
    }));


    // completed courses
    const completedCourses = await Enrollment.find({ status: "completed" })
      .populate("studentId", "name")
      .populate("courseId", "title")
      .sort({ updatedAt: -1 })
      .limit(10);

    const completionActivities = completedCourses.map((e) => ({
      id: e._id,
      user: e.studentId?.name || "Student",
      action: "completed course",
      course: e.courseId?.title || "",
      time: e.updatedAt,
      type: "success",
      icon: "CheckCircleIcon",
    }));


    // payments
    const payments = await Payment.find({ status: "paid" })
      .populate("student", "name")
      .populate("course", "title")
      .sort({ createdAt: -1 })
      .limit(10);

    const paymentActivities = payments.map((p) => ({
      id: p._id,
      user: p.student?.name || "Student",
      action: "purchased course",
      course: p.course?.title || "",
      time: p.createdAt,
      type: "info",
      icon: "CreditCardIcon",
    }));


    // certificates generated
    const certificates = await Certificate.find()
      .populate("student", "name")
      .populate("course", "title")
      .sort({ createdAt: -1 })
      .limit(10);

    const certificateActivities = certificates.map((c) => ({
      id: c._id,
      user: c.student?.name || "Student",
      action: "generated certificate",
      course: c.course?.title || "",
      time: c.createdAt,
      type: "success",
      icon: "CheckCircleIcon",
    }));


    // instructor uploaded course
    const courses = await Course.find()
      .populate("instructor", "name")
      .sort({ createdAt: -1 })
      .limit(10);

    const courseActivities = courses.map((c) => ({
      id: c._id,
      user: c.instructor?.name || "Instructor",
      action: "uploaded course",
      course: c.title,
      time: c.createdAt,
      type: "info",
      icon: "UserPlusIcon",
    }));


    // new users registered
    const users = await User.find()
      .sort({ createdAt: -1 })
      .limit(10);

    const userActivities = users.map((u) => ({
      id: u._id,
      user: u.name || "User",
      action: "registered",
      course: "",
      time: u.createdAt,
      type: "info",
      icon: "UserPlusIcon",
    }));


    // combine all activities
    const activities = [
      ...enrollmentActivities,
      ...completionActivities,
      ...paymentActivities,
      ...certificateActivities,
      ...courseActivities,
      ...userActivities,
    ]
      .sort((a, b) => new Date(b.time) - new Date(a.time))
      .slice(0, 15);

    return res.status(200).json({
      success: true,
      data: activities,
    });

  } catch (error) {
    console.error("Admin recent activities error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch activities",
    });
  }
};









const getUserDetailForAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Fetch Basic User Profile
    const user = await User.findById(id).select("-password");
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    let extraData = {};

    // 2. Role-Based Data Gathering
    if (user.role === "student") {
      const [enrollments, payments, certificates] = await Promise.all([
        Enrollment.find({ studentId: id }).populate("courseId", "title thumbnail averageRating"),
        Payment.find({ student: id }).sort({ createdAt: -1 }),
        Certificate.find({ student: id }).populate("course", "title")
      ]);

      extraData = {
        enrollments,
        payments,
        certificates,
        stats: {
          totalEnrolled: enrollments.length,
          completedCourses: enrollments.filter(e => e.status === "completed").length,
          totalSpent: payments.filter(p => p.status === "paid").reduce((acc, curr) => acc + curr.amount, 0) / 100 // assuming paise
        }
      };
    }

    else if (user.role === "instructor") {
      const courses = await Course.find({ instructor: id });

      // Calculate total students across all courses
      const totalStudents = courses.reduce((acc, course) => acc + course.enrolledStudents.length, 0);

      // Get last 5 payments related to this instructor's courses
      const courseIds = courses.map(c => c._id);
      const earnings = await Payment.find({ course: { $in: courseIds }, status: "paid" })
        .limit(10)
        .sort({ createdAt: -1 })
        .populate("student", "name email");

      extraData = {
        courses,
        earnings,
        stats: {
          totalCourses: courses.length,
          activeStudents: totalStudents,
          averageRating: courses.reduce((acc, c) => acc + c.averageRating, 0) / (courses.length || 1),
          totalRevenue: earnings.reduce((acc, curr) => acc + curr.amount, 0) / 100
        }
      };
    }

    // 3. System-wide Activity (For all roles)
    // You could add a specific "Log" model here if you have one
    const recentActivity = [
      { event: "Account Created", date: user.createdAt },
      { event: "Last Profile Update", date: user.updatedAt },
      { event: "Last Login Recorded", date: user.lastLogin }
    ];

    res.status(200).json({
      success: true,
      user,
      extraData,
      recentActivity
    });

  } catch (error) {
    console.error("Admin User Detail Error:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};







module.exports = {
  getAdminStats,
  getAdminCourses,
  getAllUsers,
  deleteUser, getUserById,
  updateUserByAdmin, updateAvatarByAdmin,
  getTopPerformingCourses,
  getCourseDistributionByCategory,
  getAdminChartData,
  getAdminDashboardStats,
  getPlatformReports,
  getSystemStatus,
  approveCourse,
  rejectCourse,
  getPendingCourseApprovals,
  getAdminRecentActivities,
  getUserDetailForAdmin
};
