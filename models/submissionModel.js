const mongoose = require("mongoose");

const submissionSchema = new mongoose.Schema(
  {
    assignmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Assignment",
      required: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
    fileUrl: String,
    marksObtained: Number,
    feedback: String,
    submittedAt: { type: Date, default: Date.now },
  }
);

module.exports = mongoose.model("Submission", submissionSchema);
