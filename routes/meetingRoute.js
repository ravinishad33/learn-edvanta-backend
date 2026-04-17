const express = require("express");
const router = express.Router();
const meetingController = require("../controllers/meetingController");
const { verifyToken } = require("../middlewares/authMiddleware");

router.use(verifyToken);

router.post("/:courseId/schedule", meetingController.scheduleMeeting);
router.get("/:courseId", meetingController.getCourseMeetings);
router.delete("/:courseId/:meetingId", meetingController.deleteMeeting);

module.exports = router;
