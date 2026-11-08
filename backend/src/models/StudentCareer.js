const mongoose = require("mongoose");

const { Schema } = mongoose;

const studentCareerSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  careerId: { type: Schema.Types.ObjectId, ref: "Career", required: true },
  savedAt: { type: Date, default: null },
  lastViewedAt: { type: Date, default: null },
  viewCount: { type: Number, min: 0, default: 0 },
  selectedForComparison: { type: Boolean, default: false },
}, { timestamps: true });

studentCareerSchema.index({ userId: 1, careerId: 1 }, { unique: true });
studentCareerSchema.index({ userId: 1, savedAt: -1 });
studentCareerSchema.index({ userId: 1, lastViewedAt: -1 });
studentCareerSchema.index({ userId: 1, selectedForComparison: 1 });

module.exports = mongoose.model("StudentCareer", studentCareerSchema);
