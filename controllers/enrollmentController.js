const Enrollment = require("../models/enrollmentModel");
const Course = require("../models/courseModel");
const Payment = require("../models/paymentModel");
const { User } = require("../models/userModel")
const { default: mongoose } = require("mongoose");
const { sendEnrollmentEmail } = require("../services/emailService");




// POST /api/enrollments/:courseId/enroll
const enrollCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const studentId = req.user.userId;

    const course = await Course.findById(courseId).populate("instructor", "name email");
    const student = await User.findById(studentId);

    if (!course || course.visibility !== "public") {
      return res.status(404).json({
        success: false,
        message: "Course not available for enrollment",
      });
    }

    const alreadyEnrolled = await Enrollment.findOne({ studentId, courseId });
    if (alreadyEnrolled) {
      return res.status(400).json({
        success: false,
        message: "Already enrolled in this course",
      });
    }

    // Create enrollment
    const enrollment = await Enrollment.create({ studentId, courseId });

    // Add student to course
    await Course.findByIdAndUpdate(courseId, {
      $addToSet: { enrolledStudents: studentId },
    });

    // Try sending email, but don't fail enrollment if it errors
    let emailSent = true;
    try {
      if (!student.email) throw new Error("Student email not set");
      await sendEnrollmentEmail(student, course);
    } catch (emailError) {
      console.error("Enrollment email failed:", emailError.message);
      emailSent = false;
    }

    // Return success response
    const message = emailSent
      ? "Enrolled successfully"
      : "Enrolled successfully, but email could not be sent";

    res.status(201).json({
      success: true,
      message,
      data: enrollment,
    });
  } catch (error) {
    console.error("Enroll error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};






// Free course enrollment API
const enrollFreeCourse = async (req, res) => {
  try {
    const { courseId } = req.body;
    const userId = req.user.userId;

    // 1️  Check already enrolled
    const existingEnrollment = await Enrollment.findOne({
      studentId: userId,
      courseId: courseId
    });

    if (existingEnrollment) {
      return res.status(400).json({
        success: false,
        message: "You are already enrolled in this course."
      });
    }

    // 2️ Create enrollment
    await Enrollment.create({
      studentId: userId,
      courseId: courseId,
      status: "active",
      progress: 0,
    });

    // 3️ Update course students
    const updatedCourse = await Course.findByIdAndUpdate(
      courseId,
      {
        $addToSet: { enrolledStudents: userId }
      },
      { new: true }
    ).populate("instructor");

    // 4️ (Optional) Create payment record as FREE
    const payment = await Payment.create({
      student: userId,
      course: courseId,
      amount: 0,
      currency: "INR",
      paymentMethod: "free",
      status: "paid",
      paidAt: new Date(),
      receipt: `FREE_${Date.now()}`
    });

    // 5 Send email
    const student = await User.findById(userId);

    try {
      await sendEnrollmentEmail(student, updatedCourse, {
        amount: 0,
        paymentId: "FREE",
        method: "Free Enrollment",
        status: "Success"
      });
    } catch (mailError) {
      console.error("Email failed:", mailError);
    }

    return res.status(200).json({
      success: true,
      message: "Enrolled successfully in free course",
      payment,
    });

  } catch (error) {
    console.error("Free enrollment error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};








const getMyEnrollments = async (req, res) => {
  try {
    const userId = req.user.userId;
    const enrollments = await Enrollment.find({ studentId: userId })
      .populate("courseId"); // optional: populate course details

    res.status(200).json(enrollments);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Failed to fetch enrollments",
    });
  }
};











const markLessonComplete = async (req, res) => {
  try {
    const { courseId, lessonId } = req.params;
    const studentId = req.user.userId;

    const enrollment = await Enrollment.findOne({ studentId, courseId });

    if (!enrollment) {
      return res.status(404).json({ message: "Enrollment not found" });
    }

    const lessonIdStr = lessonId.toString();
    console.log(`Marking lesson ${lessonIdStr} for enrollment ${enrollment._id}`);
    
    // Add lesson only if not already completed
    const isCompleted = enrollment.completedLessons.some(item => {
      const id = item._id ? item._id.toString() : item.toString();
      return id === lessonIdStr;
    });
    
    if (!isCompleted) {
      enrollment.completedLessons.push(lessonId);
    }

    // Get total lessons count from Course
    const course = await Course.findById(courseId);
    if (!course) {
        return res.status(404).json({ message: "Course not found" });
    }

    const totalLessons = course.sections.reduce(
      (total, section) => total + (section.lessons ? section.lessons.length : 0),
      0
    );

    // Calculate progress %
    if (totalLessons > 0) {
      const completedCount = enrollment.completedLessons.length;
      if (completedCount >= totalLessons) {
          enrollment.progress = 100;
      } else {
          enrollment.progress = Number(((completedCount / totalLessons) * 100).toFixed(2));
      }
    } else {
      enrollment.progress = 100; // No lessons means 100% complete
    }
    
    await enrollment.save();
    console.log(`New progress: ${enrollment.progress}%`);

    res.status(200).json({
      success: true,
      enrollment,
      progress: enrollment.progress,
      status: enrollment.status,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};








const completeCourse = async (req, res) => {

  try {
    const { courseId } = req.params;
    const studentId = req.user.userId;

    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid course ID",
      });
    }

    // Check enrollment
    const enrollment = await Enrollment.findOne({
      studentId,
      courseId,
    });


    if (!enrollment) {
      return res.status(403).json({
        success: false,
        message: "You are not enrolled in this course",
      });
    }

    // If already completed
    if (enrollment.status === "completed") {
      return res.status(400).json({
        success: false,
        message: "Course already completed",
      });
    }

    // Check progress
    if (enrollment.progress < 100) {
      return res.status(400).json({
        success: false,
        message: "Complete all lessons before finishing the course",
      });
    }


    // Mark course completed
    enrollment.status = "completed";
    enrollment.completed = true;
    enrollment.progress = 100;

    await enrollment.save();

    return res.status(200).json({
      success: true,
      message: "Course completed successfully",
      enrollment,
    });

  } catch (error) {
    console.error("Complete course error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};






// Get recent enrolled students for instructor
const getRecentEnrolledStudents = async (req, res) => {
  try {
    const instructorId = req.user.userId;

    // Step 1: Find courses created by this instructor
    const instructorCourses = await Course.find({
      instructor: instructorId,
    }).select("_id");

    const courseIds = instructorCourses.map((course) => course._id);

    if (courseIds.length === 0) {
      return res.status(200).json({
        success: true,
        count: 0,
        students: [],
      });
    }

    // Step 2: Find enrollments for those courses
    const enrollments = await Enrollment.find({
      courseId: { $in: courseIds },
    })
      .populate("studentId", "name email")
      .populate("courseId", "title")
      .sort({ createdAt: -1 })
      .limit(5);

    const recentStudents = enrollments.map((enroll) => ({
      name: enroll.studentId?.name,
      email: enroll.studentId?.email,
      courseTitle: enroll.courseId?.title,
      enrolledAt: enroll.createdAt,
      progress: enroll.progress || 0,
    }));

    return res.status(200).json({
      success: true,
      count: recentStudents.length,
      students: recentStudents,
    });
  } catch (error) {
    console.error("Error fetching recent students:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};











module.exports = {
  enrollCourse,
  enrollFreeCourse,
  markLessonComplete,
  completeCourse,
  getMyEnrollments,
  getRecentEnrolledStudents
};
