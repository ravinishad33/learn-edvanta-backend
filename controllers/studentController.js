const mongoose = require("mongoose");
const Enrollment = require("../models/enrollmentModel");
const Course = require("../models/courseModel");
const Certificate = require("../models/certificateModel")


const getStudentStats = async (req, res) => {
  try {
    const studentId = req.user.userId;

    if (!mongoose.Types.ObjectId.isValid(studentId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid student ID",
      });
    }

    // Fetch enrollments
    const enrollments = await Enrollment.find({ studentId }).populate({
      path: "courseId",
      select: "totalLessons totalDuration certificate",
    });

    const totalEnrolledCourses = enrollments.length;

    const completedCourses = enrollments.filter(
      (e) => e.status === "completed"
    );

    const totalCompleted = completedCourses.length;
    const inProgress = totalEnrolledCourses - totalCompleted;

    // Average Progress
    const avgProgress =
      totalEnrolledCourses > 0
        ? (
          enrollments.reduce((sum, e) => {
            if (typeof e.progress === "number") {
              return sum + e.progress;
            }

            const totalLessons = e.courseId?.totalLessons || 0;
            const completedLessons = e.completedLessons?.length || 0;

            return totalLessons > 0
              ? sum + (completedLessons / totalLessons) * 100
              : sum;
          }, 0) / totalEnrolledCourses
        ).toFixed(1)
        : 0;

    // Total Learning Hours (convert totalDuration to hours)
    const totalLearningHours = enrollments.reduce((sum, e) => {
      const durationStr = e.courseId?.totalDuration || "0 sec";

      // Example formats: "2 hr", "45 min", "0 sec"
      let hours = 0;

      if (durationStr.includes("hr")) {
        hours = parseFloat(durationStr);
      } else if (durationStr.includes("min")) {
        hours = parseFloat(durationStr) / 60;
      } else if (durationStr.includes("sec")) {
        hours = parseFloat(durationStr) / 3600;
      }

      return sum + hours;
    }, 0);

    // If less than 1 hour, return decimal value
    const formattedLearningHours =
      totalLearningHours < 1
        ? Number(totalLearningHours.toFixed(2))
        : Number(totalLearningHours.toFixed(1));

    // Total Certificates (from Certificate collection)
    const totalCertificates = await Certificate.countDocuments({
      student: studentId,
    });

    res.status(200).json({
      success: true,
      stats: {
        totalEnrolledCourses,
        totalCompleted,
        inProgress,
        avgProgress: Number(avgProgress),
        totalLearningHours: formattedLearningHours,
        totalCertificates,
      },
    });
  } catch (error) {
    console.error("Get student stats error:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};













// GET /api/student/courses/:courseId
const getStudentCourseDetails = async (req, res) => {
  try {
    const { courseId } = req.params;
    const studentId = req.user.userId;

    const course = await Course.findById(courseId)
      .select("-__v")
      .populate("instructor", "name");

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    const enrollment = await Enrollment.findOne({
      studentId: studentId,
      courseId: courseId,
    });

    // If not enrolled, return limited data
    if (!enrollment) {
      return res.status(200).json({
        success: true,
        data: {
          course,
          enrolled: false,
        },
      });
    }

    // Enrolled → return full data
    res.status(200).json({
      success: true,
      data: {
        course,
        enrolled: true,
        progress: enrollment.progress,
        status: enrollment.status,
      },
    });
  } catch (error) {
    console.error("Student course details error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};











const getEnrolledCourses = async (req, res) => {
  try {
    const studentId = req.user.userId;

    // Fetch all enrollments for this student
    const enrollments = await Enrollment.find({ studentId })
      .populate({
        path: "courseId",
        select: `
          title
          description
          thumbnail
          category
          level
          price
          totalLessons
          sections
          totalDuration
          certificate
          instructor
          status
          visibility
           `,
        populate: [
          { path: "instructor", select: "name email _id" },
          { path: "category", select: "name slug" },
        ],
      })
      .sort({ createdAt: -1 });

    // Filter out enrollments with deleted courses
    const validEnrollments = enrollments.filter(enroll => enroll.courseId);

    // Build course details including next lesson
    const courses = validEnrollments.map((enroll) => {
      const course = enroll.courseId;

      const allLessons = (course.sections || []).flatMap((section) =>
        (section.lessons || []).map((lesson) => ({
          ...lesson.toObject(),
          sectionTitle: section.title,
        }))
      );

      const completedSet = new Set(
        (enroll.completedLessons || []).map((id) => id.toString())
      );

      const nextLesson = allLessons.find(
        (lesson) => !completedSet.has(lesson._id.toString())
      );

      const progress = enroll.progress || 0;
      const isCompleted = enroll.status === "completed";
      const hasCertificate = isCompleted && course.certificate;





      // formated total duration 
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
        _id: course._id,
        title: course.title,
        description: course.description,
        thumbnail: course.thumbnail,
        category: course.category,
        level: course.level,
        instructor: course.instructor,
        totalLessons: course.totalLessons || 0,
        totalDuration: formattedDuration,
        sections: course.sections || [],
        enrollment: enroll,
        nextLesson: nextLesson
          ? {
            _id: nextLesson._id,
            title: nextLesson.title,
            sectionTitle: nextLesson.sectionTitle,
            duration: nextLesson.duration,
            videoUrl: nextLesson.video?.url,
          }
          : null,
        progress,
        completed: isCompleted,
        visibility: course.visibility,
        status: course.status,
        certificate: hasCertificate,
      };
    });

    res.status(200).json({
      success: true,
      total: courses.length,
      courses,
    });
  } catch (error) {
    console.error("Get enrolled courses error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch enrolled courses",
    });
  }
};













const watchEnrolledCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user.userId;
    const role = req.user.role;

    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid course ID",
      });
    }

    const course = await Course.findById(courseId)
      .select("title description sections totalDuration instructor reviews averageRating totalRatings meetings")
      .populate("instructor", "name email")
      .populate({
        path: "reviews.student",
        select: "name email avatar",
      });

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    let enrollment = null;

    const userReview = course.reviews.find(
      (review) => review.student._id.toString() === userId
    );

    // STUDENT
    if (role === "student") {
      enrollment = await Enrollment.findOne({
        studentId: userId,
        courseId,
      });

      if (!enrollment) {
        return res.status(403).json({
          success: false,
          message: "You are not enrolled in this course",
        });
      }
    }

    // INSTRUCTOR
    if (role === "instructor") {
      if (course.instructor._id.toString() !== userId) {
        return res.status(403).json({
          success: false,
          message: "You are not allowed to access this course",
        });
      }
    }

    res.status(200).json({
      success: true,
      course: {
        _id: course._id,
        title: course.title,
        description: course.description,
        sections: course.sections,
        duration: course.totalDuration,
        instructor: course.instructor,
        reviews: userReview || null,
        averageRating: course.averageRating,
        totalRatings: course.totalRatings,
        meetings: course.meetings,
      },
      enrollment: enrollment
        ? {
          _id: enrollment._id,
          studentId: enrollment.studentId,
          courseId: enrollment.courseId,
          progress: enrollment.progress,
          status: enrollment.status,
          enrolledAt: enrollment.createdAt,
          completedLessons: enrollment.completedLessons,
          updatedAt: enrollment.updatedAt,
        }
        : null,
    });

  } catch (error) {
    console.error("Watch course error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};
module.exports = { getStudentStats, getStudentCourseDetails, getEnrolledCourses, watchEnrolledCourse };
