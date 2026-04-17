const express = require("express");
const router = express.Router();
const { getStudentStats, getStudentCourseDetails, getEnrolledCourses, watchEnrolledCourse } = require("../controllers/studentController");
const { verifyToken } = require("../middlewares/authMiddleware");
const { userRole } = require("../middlewares/roleMiddleware");

router.get("/stats",verifyToken,userRole("student"), getStudentStats);

router.get("/courses/:courseId", verifyToken,userRole("student"), getStudentCourseDetails);

router.get("/enrolled-courses", verifyToken,userRole("student"), getEnrolledCourses);

router.get("/courses/:courseId/watch",verifyToken,userRole("student","instructor","admin"),watchEnrolledCourse);

module.exports = router;
