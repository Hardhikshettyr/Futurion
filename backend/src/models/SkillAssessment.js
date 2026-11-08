const mongoose = require("mongoose");

const { Schema } = mongoose;

const assessmentAnswerSchema = new Schema(
  {
    questionId: { type: String, required: true },
    answer: { type: String, default: "" },
    score: { type: Number, min: 0, required: true },
    maxPoints: { type: Number, min: 1, required: true },
    correct: { type: Boolean, default: null },
    feedback: { type: String, maxlength: 1600, default: "" },
    matchedCriteria: { type: [String], default: [] },
    areasToImprove: { type: [String], default: [] },
  },
  { _id: false },
);

const skillAssessmentSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    skillId: { type: Schema.Types.ObjectId, ref: "Skill", required: true },
    skillName: { type: String, required: true, trim: true },
    proficiencyLevel: { type: String, enum: ["beginner", "intermediate", "advanced", "expert"], required: true },
    title: { type: String, required: true, trim: true, maxlength: 180 },
    instructions: { type: [String], default: [] },
    questions: { type: [Schema.Types.Mixed], required: true },
    status: { type: String, enum: ["generated", "submitted"], default: "generated" },
    answers: { type: [assessmentAnswerSchema], default: [] },
    score: { type: Number, min: 0, default: null },
    maxScore: { type: Number, min: 1, required: true },
    percentage: { type: Number, min: 0, max: 100, default: null },
    model: { type: String, required: true },
    evaluationModel: { type: String, default: "" },
    generatedAt: { type: Date, default: Date.now },
    submittedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

skillAssessmentSchema.index({ userId: 1, createdAt: -1 });
skillAssessmentSchema.index({ userId: 1, skillId: 1, createdAt: -1 });

module.exports = mongoose.model("SkillAssessment", skillAssessmentSchema);
