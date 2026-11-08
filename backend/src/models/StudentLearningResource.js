const mongoose = require("mongoose");
const { STUDENT_LEARNING_STATUSES } = require("../utils/learningTaxonomy");

const { Schema } = mongoose;

const studentLearningResourceSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  resourceId: { type: Schema.Types.ObjectId, ref: "LearningResource", required: true },
  bookmarked: { type: Boolean, default: false },
  inLearningLibrary: { type: Boolean, default: false },
  status: { type: String, enum: STUDENT_LEARNING_STATUSES, default: "not_started" },
  startedAt: { type: Date, default: null },
  completedAt: { type: Date, default: null },
  lastActivityAt: { type: Date, default: Date.now },
}, { timestamps: true });

studentLearningResourceSchema.index({ userId: 1, resourceId: 1 }, { unique: true });
studentLearningResourceSchema.index({ userId: 1, status: 1, updatedAt: -1 });
studentLearningResourceSchema.index({ userId: 1, bookmarked: 1, updatedAt: -1 });

module.exports = mongoose.model("StudentLearningResource", studentLearningResourceSchema);
