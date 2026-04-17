const mongoose = require("mongoose");

//
// Lesson Schema
//
const lessonSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      default: "",
    },

    duration: {
      type: String, // "10:25" or "00:00"
      default: "00:00",
    },
    isFree: {
      type: Boolean,
      default: false,
    },

    order: {
      type: Number,
      required: true,
    },

    video: {
      url: {
        type: String,
        required: true,
      },
      publicId: {
        type: String,
        required: true,
      },
    },
  },
  { _id: true }
);

//
// Section Schema
//
const sectionSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      default: "",
    },

    order: {
      type: Number,
      required: true,
    },

    lessons: [lessonSchema],
  },
  { _id: true }
);





const reviewSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  rating: {
    type: Number,
    min: 1,
    max: 5,
    required: true
  },
  comment: {
    type: String,
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});





const meetingSchema = new mongoose.Schema({
  topic: { type: String, required: true },
  startTime: { type: Date, required: true },
  duration: { type: Number, required: true }, // in minutes
  zoomMeetingId: { type: String },
  joinUrl: { type: String },
  startUrl: { type: String },
  password: { type: String },
  status: {
    type: String,
    enum: ["scheduled", "started", "finished"],
    default: "scheduled",
  },
  createdAt: { type: Date, default: Date.now },
});

//
// Course Schema
//
const courseSchema = new mongoose.Schema(
  {
    // Basic Info
    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      required: true,
    },

    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },

    subcategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SubCategory",
    },

    level: {
      type: String,
      enum: ["beginner", "intermediate", "advanced"],
      default: "beginner",
    },

    language: {
      type: String,
      default: "english",
    },

    // Media
    thumbnail: {
      url: { type: String, required: true },
      publicId: { type: String, required: true },
    },

    promotionalVideo: {
      url: { type: String },
      publicId: { type: String },
    },

    // Curriculum
    sections: [sectionSchema],

    totalLessons: {
      type: Number,
      default: 0,
    },

    totalDuration: {
      type: String,
      default: "0 sec",
    },

    // Pricing
    priceType: {
      type: String,
      enum: ["free", "paid"],
      default: "free",
    },

    price: {
      type: Number,
      default: 0,
    },

    discountPrice: {
      type: Number,
      default: 0,
    },

    enrollmentType: {
      type: String,
      enum: ["open", "private"],
      default: "open",
    },

    certificate: {
      type: Boolean,
      default: false,
    },

    visibility: {
      type: String,
      enum: ["public", "private", "unlisted"],
      default: "public",
    },
    status: {
      type: String,
      enum: ["draft", "review", "published", "rejected"],
      default: "draft",
    },
    reviews: [reviewSchema],

    averageRating: {
      type: Number,
      default: 0
    },

    totalRatings: {
      type: Number,
      default: 0
    },

    // Instructor
    instructor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Meetings
    meetings: [meetingSchema],

    // Students
    enrolledStudents: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Course", courseSchema);

