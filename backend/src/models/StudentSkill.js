const mongoose = require("mongoose");
const {
  EVIDENCE_STATUSES,
  EVIDENCE_TYPES,
  LEARNING_STATUSES,
  PROFICIENCY_LEVELS,
} = require("../utils/skillTaxonomy");

const { Schema } = mongoose;

const evidenceSchema = new Schema({
  evidenceType: { type: String, enum: EVIDENCE_TYPES, required: true },
  referenceId: { type: Schema.Types.ObjectId, default: null },
  description: { type: String, trim: true, maxlength: 1000, default: "" },
  externalUrl: { type: String, trim: true, maxlength: 500, default: "" },
  date: { type: Date, default: null },
  ownerUserId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  createdAt: { type: Date, default: Date.now },
});

const studentSkillSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    studentProfileId: {
      type: Schema.Types.ObjectId,
      ref: "StudentProfile",
      required: true,
    },
    skillId: { type: Schema.Types.ObjectId, ref: "Skill", required: true },
    proficiency: { type: String, enum: PROFICIENCY_LEVELS, required: true },
    evidenceStatus: {
      type: String,
      enum: EVIDENCE_STATUSES,
      default: "self_declared",
    },
    learningStatus: {
      type: String,
      enum: LEARNING_STATUSES,
      default: "not_started",
    },
    confidenceLevel: { type: Number, min: 1, max: 5, default: null },
    description: { type: String, trim: true, maxlength: 1000, default: "" },
    evidenceReferences: { type: [evidenceSchema], default: [] },
    startedAt: { type: Date, default: null },
    lastPracticedAt: { type: Date, default: null },
    acquiredAt: { type: Date, default: null },
    notes: { type: String, trim: true, maxlength: 2000, default: "" },
  },
  { timestamps: true },
);

studentSkillSchema.index({ userId: 1, skillId: 1 }, { unique: true });
studentSkillSchema.index({ userId: 1, updatedAt: -1 });
studentSkillSchema.index({ userId: 1, proficiency: 1, evidenceStatus: 1 });
studentSkillSchema.index({ studentProfileId: 1 });

module.exports = mongoose.model("StudentSkill", studentSkillSchema);
