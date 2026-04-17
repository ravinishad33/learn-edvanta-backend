const mongoose = require("mongoose");

const discussionSchema = new mongoose.Schema(
  {
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    text: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 1000,
    },
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Discussion",
      default: null,
    },
    upvotes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    upvoteCount: {
      type: Number,
      default: 0,
    },
    isEdited: {
      type: Boolean,
      default: false,
    },
    editedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

// Indexes for high performance
discussionSchema.index({ parentId: 1 });
discussionSchema.index({ course: 1, createdAt: -1 });

//Sync Upvote Count before saving
discussionSchema.pre("save", function (next) {
  if (this.isModified("upvotes")) {
    this.upvoteCount = this.upvotes.length;
  }
});

module.exports = mongoose.model("Discussion", discussionSchema);