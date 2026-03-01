const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema({
  quizId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Quiz",
    required: true,
  },
  question: String,
  options: [String],
  correctAnswer: String,
  marks: Number,
});

module.exports = mongoose.model("Question", questionSchema);
