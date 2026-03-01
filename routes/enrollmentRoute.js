const express = require("express");
const router = express.Router();
const { enrollCourse, markLessonComplete, completeCourse, getMyEnrollments, getRecentEnrolledStudents } = require("../controllers/enrollmentController");
const { verifyToken } = require("../middlewares/authMiddleware");
const { userRole } = require("../middlewares/roleMiddleware");

router.post("/:courseId/enroll", verifyToken,userRole("student"), enrollCourse);

router.get("/my", verifyToken,userRole("student"), getMyEnrollments);


router.patch("/:courseId/lessons/:lessonId", verifyToken,userRole("student"),markLessonComplete);


// mark course completed 
router.patch("/:courseId/complete",verifyToken,userRole("student"),completeCourse);



router.get("/instructor/recent-students", verifyToken,userRole("instructor"), getRecentEnrolledStudents);

module.exports = router;
