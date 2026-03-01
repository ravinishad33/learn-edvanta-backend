const mongoose = require("mongoose");

const assignmentSchema = new mongoose.Schema(
  {
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    title: String,
    description: String,
    dueDate: Date,
    totalMarks: Number,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Assignment", assignmentSchema);
