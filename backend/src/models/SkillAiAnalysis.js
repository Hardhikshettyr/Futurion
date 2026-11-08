const mongoose = require("mongoose");

const { Schema } = mongoose;

const skillAiAnalysisSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    profileFingerprint: { type: String, required: true, select: false },
    competencyRequirements: { type: [Schema.Types.Mixed], default: [] },
    analysis: { type: Schema.Types.Mixed, required: true },
    model: { type: String, required: true },
    generatedAt: { type: Date, required: true, default: Date.now },
  },
  { timestamps: true },
);

skillAiAnalysisSchema.index({ userId: 1, generatedAt: -1 });

module.exports = mongoose.model("SkillAiAnalysis", skillAiAnalysisSchema);
