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







































// const mongoose = require('mongoose');
// const lessonSchema = new mongoose.Schema({
//   title: String,
//   description: String,
//   startTime: String,
//   duration: String,
//   order: Number,
//   completed: {
//     type: Boolean,
//     default: false,
//   },
// });


// const courseSchema = new mongoose.Schema({
//   // Basic Information
//   title: String,
//   description: String,

//   // Category
//   category: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: "Category"

//   },

//   subcategory: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: "SubCategory"

//   },
//   level: String,
//   language: String,

//   // Media
//   thumbnail: {
//     url: { type: String, required: true },
//     publicId: { type: String, required: true }
//   },
//   video: {
//     url: { type: String, required: true },
//     publicId: { type: String, required: true }
//   },
//   promotionalVideo: {
//     url: { type: String },
//     publicId: { type: String }
//   },

//   // Curriculum
//   modules: [mongoose.Schema.Types.ObjectId], // Reference to Module documents
//   lessons: [lessonSchema],


//   // Pricing
//   priceType: String,
//   price: Number,
//   discountedPrice: Number,
//   currency: String,

//   // Settings
//   visibility: String,
//   enrollmentType: String,
//   certificate: Boolean,

//   // Requirements
//   requirements: [String],
//   learningOutcomes: [String],
//   targetAudience: [String],

//   // SEO
//   seoTitle: String,
//   seoDescription: String,
//   metaKeywords: [String],

//   // Instructor
//   instructorId: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: "User"
//   },

//   // Status
//   isPublished: Boolean,
//   status: String,

//   // Stats
//   totalLessons: Number,
//   totalDuration: String,
//   enrolledStudents: [
//     {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "User"
//     }
//   ],

//   // Timestamps
//   createdAt: Date,
//   updatedAt: Date,
//   publishDate: Date
// }, {
//   timestamps: true
// });

// module.exports = mongoose.model('Course', courseSchema);









/*

const lessonSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },

  duration: {
    type: String, // "18:10"
    required: true,
  },

  type: {
    type: String,
    enum: ["video", "quiz", "assignment"],
    default: "video",
  },

  videoUrl: {
    type: String,
  },

  order: {
    type: Number,
    required: true,
  },
});

const moduleSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },

  order: {
    type: Number,
    required: true,
  },

  lessons: [lessonSchema],
});

const courseSchema = new mongoose.Schema(
  {
    title: String,
    description: String,

    modules: [moduleSchema], // <-- important change

    instructorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    price: Number,
    discountedPrice: Number,

    visibility: String,

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



*/