const mongoose = require("mongoose");

const quizSchema = new mongoose.Schema(
  {
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    title: String,
    totalMarks: Number,
    timeLimit: Number,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Quiz", quizSchema);
