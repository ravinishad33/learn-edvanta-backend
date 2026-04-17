const mongoose = require("mongoose");

const certificateSchema = new mongoose.Schema(
  {
    certificateId: {
      type: String,
      unique: true,
      required: true
    },

    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true
    },

    file: {
      url: {
        type: String,
        required: true
      },
      publicId: {
        type: String,
        required: true
      }
    },

    issuedAt: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);


module.exports = mongoose.model("Certificate", certificateSchema);