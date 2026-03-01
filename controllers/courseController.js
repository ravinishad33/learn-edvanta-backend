// controllers/courseController.js
const Course = require("../models/courseModel"); // your Mongoose model
const Enrollment = require("../models/enrollmentModel");
const { logQueryTime } = require("../services/systemStatsService");
const mongoose = require("mongoose")

//Create a new course
const createCourse = async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      subcategory,
      level,
      language,
      priceType,
      price,
      discountPrice,
      enrollmentType,
      certificate,
      visibility,
      status,
      sections,
      thumbnail,
      promotionalVideo
    } = req.body;

    // Basic validation
    if (!title || !description || !category || !thumbnail) {
      return res.status(400).json({
        success: false,
        message: "Required fields are missing",
      });
    }

    // Calculate total lessons & duration
    let totalLessons = 0;
    let totalDuration = 0; // in seconds

    if (sections && sections.length > 0) {
      sections.forEach(section => {
        if (section.lessons && section.lessons.length > 0) {
          totalLessons += section.lessons.length;

          section.lessons.forEach(lesson => {
            // duration format: "mm:ss"
            const [min, sec] = lesson.duration.split(":").map(Number);
            totalDuration += (min * 60) + sec;
          });
        }
      });
    }

    // Convert totalDuration to readable format
    const totalDurationFormatted = `${totalDuration} sec`;

    const newCourse = new Course({
      title,
      description,
      category,
      subcategory,
      level,
      language,
      priceType,
      price: priceType === "paid" ? price : 0,
      discountPrice: priceType === "paid" ? discountPrice : 0,
      enrollmentType,
      certificate,
      visibility,
      status,
      thumbnail,
      promotionalVideo,
      sections,
      totalLessons,
      totalDuration: totalDurationFormatted,
      instructor: req.user.userId,
    });

    await newCourse.save();

    res.status(201).json({
      success: true,
      message: "Course created successfully",
      course: newCourse,
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};







// controllers/courseController.js
const updateCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const {
      title,
      description,
      category,
      subcategory,
      level,
      language,
      priceType,
      price,
      discountPrice,
      enrollmentType,
      certificate,
      visibility,
      status,
      sections,
      thumbnail,
      promotionalVideo
    } = req.body;

    // Basic validation
    if (!title || !description || !category || !thumbnail) {
      return res.status(400).json({
        success: false,
        message: "Required fields are missing",
      });
    }

    // Check if course exists and user has permission
    const existingCourse = await Course.findById(courseId);

    if (!existingCourse) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    // Verify that the instructor owns this course
    if (existingCourse.instructor.toString() !== req.user.userId) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to update this course",
      });
    }

    // Calculate total lessons & duration
    let totalLessons = 0;
    let totalDuration = 0; // in seconds

    if (sections && sections.length > 0) {
      sections.forEach(section => {
        if (section.lessons && section.lessons.length > 0) {
          totalLessons += section.lessons.length;

          section.lessons.forEach(lesson => {
            // Check if duration is in format "mm:ss" or already in seconds with "sec" suffix
            if (lesson.duration) {
              if (lesson.duration.includes(':')) {
                // Format: "mm:ss"
                const [min, sec] = lesson.duration.split(":").map(Number);
                totalDuration += (min * 60) + sec;
              } else if (lesson.duration.includes('sec')) {
                // Format: "X sec"
                const sec = parseInt(lesson.duration) || 0;
                totalDuration += sec;
              } else {
                // Assume it's in seconds as number
                totalDuration += parseInt(lesson.duration) || 0;
              }
            }
          });
        }
      });
    }

    // Convert totalDuration to readable format
    const totalDurationFormatted = totalDuration < 60
      ? `${totalDuration} sec`
      : totalDuration < 3600
        ? `${Math.floor(totalDuration / 60)} min`
        : `${Math.floor(totalDuration / 3600)}h ${Math.floor((totalDuration % 3600) / 60)}min`;

    // Prepare updated course data
    const updatedCourseData = {
      title,
      description,
      category,
      subcategory: subcategory || null,
      level,
      language,
      priceType,
      price: priceType === "paid" ? price : 0,
      discountPrice: priceType === "paid" ? discountPrice : 0,
      enrollmentType,
      certificate,
      visibility,
      status,
      thumbnail,
      promotionalVideo: promotionalVideo || null,
      sections: sections || [],
      totalLessons,
      totalDuration: totalDurationFormatted,
      updatedAt: Date.now()
    };

    // Update the course
    const updatedCourse = await Course.findByIdAndUpdate(
      courseId,
      updatedCourseData,
      { new: true, runValidators: true }
    ).populate('category', 'name')
      .populate('subcategory', 'name')
      .populate('instructor', 'name email');

    res.status(200).json({
      success: true,
      message: "Course updated successfully",
      course: updatedCourse,
    });

  } catch (error) {
    console.error("Course update error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while updating course",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};









// Delete Course (Admin / Instructor)
const deleteCourse = async (req, res) => {
  try {
    const { courseId } = req.params;

    // Find the course
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    // Optional: Delete enrollments related to this course
    await Enrollment.deleteMany({ course: courseId });

    // Delete the course itself
    await Course.findByIdAndDelete(courseId);

    res.status(200).json({
      success: true,
      message: `Course "${course.title}" and all its associated enrollments and payments have been successfully deleted.`,
    });
  } catch (error) {
    console.error("Delete course error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete course. Please try again later.",
    });
  }
};




// get all courses
const getAllCourses = async (req, res) => {
  try {
    const start = Date.now();

    const courses = await Course.find()
      .populate("sections")
      .populate("category")
      .populate("subcategory")
      .populate("enrolledStudents")
      .populate("instructor");

    if (!courses || courses.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No courses found!"
      });
    }

    // Count new courses (e.g., created in the last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const newCoursesCount = courses.filter(
      (course) => new Date(course.createdAt) >= sevenDaysAgo
    ).length;

    const duration = Date.now() - start;
    logQueryTime(duration); // record query duration

    return res.status(200).json({
      success: true,
      message: "Courses fetched successfully!",
      courses,
      newCoursesCount
    });

  } catch (error) {
    console.error("Error fetching courses:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};








// // get all courses
// const getPublishedCourses = async (req, res) => {

//   try {
//     const start = Date.now();

//     const courses = await Course.find({
//       status: "published",
//       visibility: "public",
//     })
//       .populate("sections")
//       .populate("category")
//       .populate("subcategory")
//       .populate("enrolledStudents")
//       .populate("instructor");

//     if (!courses || courses.length === 0) {
//       return res.status(404).json({
//         success: false,
//         message: "No courses found!"
//       });
//     }

//     // Count new courses (e.g., created in the last 7 days)
//     const sevenDaysAgo = new Date();
//     sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

//     const newCoursesCount = courses.filter(
//       (course) => new Date(course.createdAt) >= sevenDaysAgo
//     ).length;

//     const duration = Date.now() - start;
//     logQueryTime(duration); // record query duration

//     return res.status(200).json({
//       success: true,
//       message: "Courses fetched successfully!",
//       courses,
//       newCoursesCount
//     });

//   } catch (error) {
//     console.error("Error fetching courses:", error);
//     return res.status(500).json({
//       success: false,
//       message: "Server error",
//       error: error.message
//     });
//   }
// }








// Get all published public courses
const getPublishedCourses = async (req, res) => {
  try {
    const startTime = Date.now();

    const courses = await Course.find({
      status: "published",
      visibility: "public",
    })
      .populate("sections")
      .populate("category")
      .populate("subcategory")
      .populate("enrolledStudents")
      .populate("instructor");

    if (!courses || courses.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No courses found!",
      });
    }

    // Count new courses (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const newCoursesCount = courses.filter(
      (course) => new Date(course.createdAt) >= sevenDaysAgo
    ).length;

    // ✅ Format totalDuration
    const formattedCourses = courses.map((course) => {
      let formattedDuration = "0 sec";

      if (course.totalDuration) {
        const duration = course.totalDuration.toLowerCase();
        let totalMinutes = 0;

        if (duration.includes("hour")) {
          const hours = parseFloat(duration);
          totalMinutes = hours * 60;
        } else if (duration.includes("min")) {
          totalMinutes = parseFloat(duration);
        } else if (duration.includes("sec")) {
          const seconds = parseFloat(duration);
          totalMinutes = seconds / 60;
        }

        if (totalMinutes < 1) {
          const seconds = (totalMinutes * 60).toFixed(0);
          formattedDuration = `${seconds} sec`;
        } else if (totalMinutes < 60) {
          formattedDuration = `${totalMinutes.toFixed(1)} min`;
        } else {
          const hours = totalMinutes / 60;
          formattedDuration = `${hours.toFixed(1)} hour`;
        }
      }

      return {
        ...course.toObject(),
        totalDuration: formattedDuration,
      };
    });

    const queryDuration = Date.now() - startTime;
    logQueryTime(queryDuration);

    return res.status(200).json({
      success: true,
      message: "Courses fetched successfully!",
      courses: formattedCourses,
      newCoursesCount,
    });

  } catch (error) {
    console.error("Error fetching courses:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};











// Get courses created by instructor
const getInstructorCourses = async (req, res) => {
  try {
    const instructor = req.user.userId;

    const courses = await Course.find({ instructor })
      .populate("category", "name thumbnail")
      .populate("subcategory", "name")
      .sort({ createdAt: -1 });

    if (!courses.length) {
      return res.status(200).json({
        success: true,
        message: "No courses created yet",
        courses: [],
      });
    }

    // Add avgRating for each course
    const coursesWithRating = courses.map((course) => {
      const ratings = course.reviews?.map((r) => r.rating) || [];
      const avgRating =
        ratings.length > 0
          ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length
          : 0;
      return { ...course.toObject(), avgRating };
    });

    res.status(200).json({
      success: true,
      message: "Instructor courses fetched successfully",
      courses: coursesWithRating,
    });
  } catch (error) {
    console.error("Get instructor courses error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};





// get course by id
const getCourseById = async (req, res) => {
  try {
    const courseId = req.params.id;
    const userId = req.user.userId;

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid course ID format",
      });
    }

    // Fetch course with all necessary populated fields
    const course = await Course.findById(courseId)
      .populate("category", "name")
      .populate("subcategory", "name")
      .populate("instructor", "name email avatar bio role")
      .populate({
        path: "reviews.student",
        select: "name avatar",
      })
      .populate("enrolledStudents", "name email avatar");

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }


    // Check if user is enrolled
    let isEnrolled = false;
    let enrollmentStatus = null;

    if (userId) {
      // Method 1: Check by _id in populated objects
      isEnrolled = course.enrolledStudents?.some((student) => {
        // Check both possible formats
        if (student._id) {
          return student._id.toString() === userId.toString();
        }
        return student.toString() === userId.toString();
      });

    }


    // Calculate course statistics
    let totalDurationSeconds = 0;
    let totalLessonsCount = 0;
    let freeLessonsCount = 0;

    // Process sections and lessons
    const processedSections = course.sections.map((section) => {
      let sectionDurationSeconds = 0;
      let sectionLessonsCount = section.lessons?.length || 0;
      totalLessonsCount += sectionLessonsCount;

      // Process lessons
      const processedLessons = section.lessons?.map((lesson) => {
        // Calculate lesson duration in seconds
        if (lesson.duration && lesson.duration !== "00:00") {
          const [minutes, seconds] = lesson.duration.split(":").map(Number);
          const lessonDurationSec = (minutes || 0) * 60 + (seconds || 0);
          sectionDurationSeconds += lessonDurationSec;
          totalDurationSeconds += lessonDurationSec;
        }

        // Count free lessons
        if (lesson.isFree) {
          freeLessonsCount++;
        }

        return {
          _id: lesson._id,
          title: lesson.title,
          description: lesson.description || "",
          duration: lesson.duration,
          isFree: lesson.isFree,
          order: lesson.order,
          video: lesson.video,
        };
      });

      return {
        _id: section._id,
        title: section.title,
        description: section.description || "",
        order: section.order,
        lessons: processedLessons || [],
        totalLessons: sectionLessonsCount,
        totalDuration: formatDuration(sectionDurationSeconds),
      };
    });

    // Calculate review statistics
    const totalReviews = course.reviews?.length || 0;
    let averageRating = 0;

    if (totalReviews > 0) {
      const ratingSum = course.reviews.reduce(
        (sum, review) => sum + (review.rating || 0),
        0
      );
      averageRating = Number((ratingSum / totalReviews).toFixed(1));
    }

    // Calculate rating distribution
    const ratingDistribution = [5, 4, 3, 2, 1].map((star) => {
      const count = course.reviews?.filter(
        (review) => Math.floor(review.rating) === star
      ).length;
      const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
      return {
        star,
        count,
        percentage: Math.round(percentage),
      };
    });

    // Format enrollment count
    const enrolledCount = course.enrolledStudents?.length || 0;

    // Format the response
    const formattedCourse = {
      _id: course._id,
      title: course.title,
      description: course.description,

      // Category Info
      category: course.category,
      subcategory: course.subcategory,
      level: course.level,
      language: course.language,

      // Media
      thumbnail: course.thumbnail,
      promotionalVideo: course.promotionalVideo || null,

      // Curriculum
      sections: processedSections,
      totalLessons: totalLessonsCount,
      totalDuration: formatDuration(totalDurationSeconds),
      freeLessons: freeLessonsCount,

      // Pricing
      priceType: course.priceType,
      price: course.price || 0,
      discountPrice: course.discountPrice || 0,
      finalPrice:
        course.priceType === "paid"
          ? (course.discountPrice || course.price)
          : 0,
      discountPercentage:
        course.priceType === "paid" && course.price > 0 && course.discountPrice
          ? Math.round(((course.price - course.discountPrice) / course.price) * 100)
          : 0,
      isFree: course.priceType === "free",

      // Settings
      enrollmentType: course.enrollmentType,
      certificate: course.certificate,
      visibility: course.visibility,
      status: course.status,

      // Reviews
      reviews: course.reviews?.map((review) => ({
        _id: review._id,
        student: review.student,
        rating: review.rating,
        comment: review.comment,
        createdAt: review.createdAt,
      })),
      averageRating,
      totalReviews,
      ratingDistribution,

      // Instructor
      instructor: course.instructor,

      // Students
      enrolledStudents: course.enrolledStudents,
      enrolledCount,
      canAccess: isEnrolled || course.priceType === 'free',
      isEnrolled,

      // Metadata
      createdAt: course.createdAt,
      updatedAt: course.updatedAt,
    };

    return res.status(200).json({
      success: true,
      message: "Course fetched successfully",
      course: formattedCourse,
    });
  } catch (error) {
    console.error("Get course by ID error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching course",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};







// Helper function to format duration
const formatDuration = (totalSeconds) => {
  if (totalSeconds < 60) {
    return `${totalSeconds} sec`;
  } else if (totalSeconds < 3600) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return seconds > 0 ? `${minutes} min ${seconds} sec` : `${minutes} min`;
  } else {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (minutes > 0 && seconds > 0) {
      return `${hours}h ${minutes}min ${seconds}sec`;
    } else if (minutes > 0) {
      return `${hours}h ${minutes}min`;
    } else {
      return `${hours}h`;
    }
  }
};



const addOrUpdateReview = async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const courseId = req.params.courseId;
    const studentId = req.user.userId;

    const course = await Course.findById(courseId);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    const existingReview = course.reviews.find(
      (rev) => rev.student.toString() === studentId
    );

    if (existingReview) {
      existingReview.rating = rating;
      existingReview.comment = comment;
    } else {
      course.reviews.push({
        student: studentId,
        rating,
        comment,
      });
    }

    //  CALCULATE averageRating & totalRatings
    course.totalRatings = course.reviews.length;

    const total = course.reviews.reduce(
      (sum, rev) => sum + rev.rating,
      0
    );

    course.averageRating =
      course.totalRatings > 0
        ? Number((total / course.totalRatings).toFixed(1))
        : 0;

    await course.save();

    res.status(200).json({
      success: true,
      message: existingReview
        ? "Review updated successfully"
        : "Review added successfully",
      review: existingReview || course.reviews[course.reviews.length - 1],
      averageRating: course.averageRating,
      totalRatings: course.totalRatings,
    });

  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};




module.exports = {
  createCourse,
  updateCourse,
  deleteCourse,
  getAllCourses,
  getPublishedCourses,
  getInstructorCourses,
  getCourseById,
  addOrUpdateReview
};
