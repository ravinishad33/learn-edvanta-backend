const express = require('express');
const router = express.Router();
const { createCourse,updateCourse, getAllCourses, getInstructorCourses, getCourseById, deleteCourse,getPublishedCourses, addOrUpdateReview } = require('../controllers/courseController');
const { verifyToken } = require('../middlewares/authMiddleware');
const { userRole } = require('../middlewares/roleMiddleware');


// create course 
router.post('/',verifyToken,userRole("instructor"),createCourse);

// update course 
router.put("/:courseId", verifyToken,userRole("instructor"), updateCourse);

// delete course 
router.delete("/delete/:courseId", verifyToken,userRole("instructor","admin"), deleteCourse);

router.get("/instructor", verifyToken,userRole("instructor"), getInstructorCourses);


// // Get all courses
router.get('/', getAllCourses);

// get all published courses 
router.get("/published", getPublishedCourses);


router.get("/:id", verifyToken, getCourseById);

router.post("/:courseId/review",verifyToken,userRole("student"),addOrUpdateReview);



module.exports = router;