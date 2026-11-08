const mongoose = require("mongoose");

const { Schema } = mongoose;

const learningStrategySchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    targetSkillId: { type: Schema.Types.ObjectId, ref: "Skill", required: true },
    targetSkillName: { type: String, required: true, trim: true },
    currentProficiency: { type: String, enum: ["beginner", "intermediate", "advanced", "expert", null], default: null },
    requiredProficiency: { type: String, enum: ["beginner", "intermediate", "advanced", "expert"], required: true },
    preferredLearningTime: { type: String, trim: true, maxlength: 240, default: "" },
    strategy: { type: Schema.Types.Mixed, required: true },
    status: { type: String, enum: ["draft", "saved"], default: "draft" },
    studentNotes: { type: String, trim: true, maxlength: 2000, default: "" },
    model: { type: String, required: true },
    generatedAt: { type: Date, required: true, default: Date.now },
  },
  { timestamps: true },
);

learningStrategySchema.index({ userId: 1, updatedAt: -1 });
learningStrategySchema.index({ userId: 1, targetSkillId: 1, status: 1 });

module.exports = mongoose.model("LearningStrategy", learningStrategySchema);
