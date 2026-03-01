const express = require("express");
const router = express.Router();
const { getAdminStats, getAllUsers, deleteUser, getUserById, updateUserByAdmin, updateAvatarByAdmin, getTopPerformingCourses, getCourseDistributionByCategory, getAdminDashboardStats, getAdminChartData, getAdminDashboardFullStats, getPlatformReports, getSystemStatus, getAdminCourses, approveCourse, rejectCourse, getPendingCourseApprovals } = require("../controllers/adminController");
const { verifyToken } = require("../middlewares/authMiddleware");
const { userRole } = require("../middlewares/roleMiddleware");
const { upload } = require("../middlewares/multerMiddleware");

router.get("/stats", verifyToken, userRole("admin"), getAdminStats);
router.get("/users", verifyToken, userRole("admin"), getAllUsers);
router.delete("/users/:id", verifyToken, userRole("admin"), deleteUser);
router.get("/users/:id", verifyToken, userRole("admin"), getUserById);

router.put("/users/:id",verifyToken,userRole("admin"),updateUserByAdmin);

// router.put('/users/avatar/:id',verifyToken,upload.single("avatar"),updateAvatarByAdmin);



router.get("/top-courses",verifyToken,userRole("admin"),getTopPerformingCourses);

router.get("/course-distribution/category",verifyToken,userRole("admin"),getCourseDistributionByCategory);

// approve course
router.patch("/approve/:courseId",verifyToken,userRole("admin"),approveCourse);

router.patch("/reject/:courseId",verifyToken, userRole("admin"), rejectCourse);

router.get("/courses", verifyToken, userRole("admin"), getAdminCourses);


// GET /api/admin/pending-courses
router.get("/pending-courses", verifyToken, userRole("admin"), getPendingCourseApprovals);



router.get("/chart-stats", verifyToken, userRole("admin"), getAdminChartData);


router.get("/dashboard-stats", verifyToken,userRole("admin"),getAdminDashboardStats);

router.get("/platform-reports", verifyToken,userRole("admin"),getPlatformReports);

router.get("/system-status", verifyToken,userRole("admin"),getSystemStatus);




module.exports = router;
