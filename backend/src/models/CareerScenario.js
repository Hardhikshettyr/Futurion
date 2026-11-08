const mongoose = require("mongoose");
const { PROFICIENCY_LEVELS } = require("../utils/skillTaxonomy");

const { Schema } = mongoose;

const LEARNING_PREFERENCES = [
  "structured_courses",
  "project_based",
  "mentoring",
  "self_directed",
  "peer_learning",
  "mixed",
];

const hypotheticalSkillSchema = new Schema(
  {
    skillId: { type: Schema.Types.ObjectId, ref: "Skill", required: true },
    proficiency: { type: String, enum: PROFICIENCY_LEVELS, required: true },
  },
  { _id: false },
);

const careerScenarioSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, trim: true, maxlength: 1600, default: "" },
    targetCareerId: { type: Schema.Types.ObjectId, ref: "Career", required: true },
    startingPointType: {
      type: String,
      enum: ["existing_profile", "custom_hypothetical"],
      default: "existing_profile",
    },
    hypotheticalSkills: {
      type: [hypotheticalSkillSchema],
      default: [],
      validate: {
        validator(values) {
          return new Set(values.map((item) => String(item.skillId))).size === values.length;
        },
        message: "Hypothetical skills cannot be duplicated",
      },
    },
    hypotheticalQualifications: {
      type: [{ type: String, trim: true, maxlength: 240 }],
      default: [],
    },
    weeklyLearningHours: { type: Number, min: 1, max: 80, default: 5 },
    learningPreferences: {
      type: [{ type: String, enum: LEARNING_PREFERENCES }],
      default: ["mixed"],
    },
    targetDate: { type: Date, default: null },
    constraints: { type: String, trim: true, maxlength: 2000, default: "" },
    status: { type: String, enum: ["active", "archived"], default: "active" },
  },
  { timestamps: true },
);

careerScenarioSchema.index({ userId: 1, status: 1, updatedAt: -1 });
careerScenarioSchema.index({ userId: 1, targetCareerId: 1 });

module.exports = mongoose.model("CareerScenario", careerScenarioSchema);
module.exports.LEARNING_PREFERENCES = LEARNING_PREFERENCES;
