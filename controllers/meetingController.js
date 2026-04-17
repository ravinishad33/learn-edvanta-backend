const Course = require("../models/courseModel");
const zoomService = require("../services/zoomService");


// Schedule a meeting for a course
exports.scheduleMeeting = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { topic, startTime, duration } = req.body;

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    // Verify instructor
    if (course.instructor.toString() !== req.user.userId.toString()) {
      return res.status(403).json({ message: "Not authorized to add meetings to this course" });
    }

    // FIX: Safely parse the frontend "YYYY-MM-DDTHH:mm" string strictly as IST 
    // by appending the Indian Standard Time offset (+05:30) before parsing.
    const istTimeStr = startTime.includes("+") || startTime.includes("Z") 
      ? startTime 
      : `${startTime}+05:30`;
      
    const parsedTime = new Date(istTimeStr);
    const formattedTime = parsedTime.toISOString();

    const zoomMeeting = await zoomService.createMeeting(
      topic,
      formattedTime,
      duration,
      "Asia/Kolkata"
    );

    // Save to database (store ISO)
    const newMeeting = {
      topic,
      startTime: formattedTime,
      duration,
      zoomMeetingId: zoomMeeting.id.toString(),
      joinUrl: zoomMeeting.join_url,
      startUrl: zoomMeeting.start_url,
      password: zoomMeeting.password,
      status: "scheduled",
    };

    course.meetings.push(newMeeting);
    await course.save();

    const savedMeeting = course.meetings[course.meetings.length - 1];

    // Broadcast
    const io = req.app.get("io");
    if (io) {
      const publicMeeting = savedMeeting.toObject();
      delete publicMeeting.startUrl;

      io.to(courseId.toString()).emit("new_meeting", publicMeeting);
    }

    res.status(201).json({
      message: "Meeting scheduled successfully",
      meeting: savedMeeting,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// Get all meetings for a course
exports.getCourseMeetings = async (req, res) => {
  try {
    const { courseId } = req.params;
    const course = await Course.findById(courseId).select("meetings instructor");
    
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    // Filter startUrl if not the instructor
    const meetings = course.meetings.map(m => {
      const meeting = m.toObject();
      if (req.user && req.user.userId.toString() !== course.instructor.toString()) {
        delete meeting.startUrl;
      }
      return meeting;
    });

    res.status(200).json(meetings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete a meeting
exports.deleteMeeting = async (req, res) => {
  try {
    const { courseId, meetingId } = req.params;

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    if (course.instructor.toString() !== req.user.userId.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const meeting = course.meetings.id(meetingId);
    if (!meeting) {
      return res.status(404).json({ message: "Meeting not found" });
    }

    // Delete from Zoom
    await zoomService.deleteMeeting(meeting.zoomMeetingId);

    // Remove from DB
    course.meetings.pull(meetingId);
    await course.save();

    //  Broadcast the deletion to the course room
    const io = req.app.get("io");
    if (io) {
      io.to(courseId.toString()).emit("deleted_meeting", { id: meetingId });
    }

    res.status(200).json({ message: "Meeting deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};