const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    slug: { type: String, unique: true },
    description: String,
    courseCount: Number,
    isActive: { type: Boolean, default: true },
    order: Number,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Category", categorySchema);
