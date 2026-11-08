const mongoose = require("mongoose");

const { Schema } = mongoose;

const ROADMAP_STATUSES = ["active", "paused", "archived"];
const ROADMAP_TASK_STATUSES = ["not_started", "in_progress", "completed"];
const ROADMAP_STAGE_KEYS = ["foundations", "core_skills", "advanced_skills", "application"];
const ROADMAP_TASK_TYPES = ["skill_development", "skill_evidence", "portfolio_application", "certification_preparation"];

const roadmapTaskSchema = new Schema({
  stableKey: { type: String, required: true, trim: true, maxlength: 200 },
  taskType: { type: String, enum: ROADMAP_TASK_TYPES, required: true },
  title: { type: String, required: true, trim: true, maxlength: 220 },
  description: { type: String, required: true, trim: true, maxlength: 1600 },
  relatedSkillIds: [{ type: Schema.Types.ObjectId, ref: "Skill" }],
  prerequisiteSkillIds: [{ type: Schema.Types.ObjectId, ref: "Skill" }],
  dependsOnTaskIds: [{ type: Schema.Types.ObjectId }],
  linkedResourceIds: [{ type: Schema.Types.ObjectId, ref: "LearningResource" }],
  targetProficiency: { type: String, enum: ["beginner", "intermediate", "advanced", "expert", ""], default: "" },
  estimatedHours: { type: Number, min: 1, max: 500, required: true },
  status: { type: String, enum: ROADMAP_TASK_STATUSES, default: "not_started" },
  required: { type: Boolean, default: true },
  displayOrder: { type: Number, min: 0, required: true },
  createdFrom: { type: String, enum: ["initial", "refresh"], default: "initial" },
  completedAt: { type: Date, default: null },
  retired: { type: Boolean, default: false },
  retiredAt: { type: Date, default: null },
  retirementReason: { type: String, trim: true, maxlength: 500, default: "" },
}, { timestamps: true });

const roadmapStageSchema = new Schema({
  stageKey: { type: String, enum: ROADMAP_STAGE_KEYS, required: true },
  title: { type: String, required: true, trim: true, maxlength: 160 },
  description: { type: String, required: true, trim: true, maxlength: 700 },
  displayOrder: { type: Number, min: 0, required: true },
  tasks: { type: [roadmapTaskSchema], default: [] },
});

const careerRoadmapSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  name: { type: String, required: true, trim: true, maxlength: 140 },
  targetCareerId: { type: Schema.Types.ObjectId, ref: "Career", required: true },
  weeklyLearningHours: { type: Number, min: 1, max: 80, default: 5 },
  targetDate: { type: Date, default: null },
  status: { type: String, enum: ROADMAP_STATUSES, default: "active" },
  stages: { type: [roadmapStageSchema], default: [] },
  generationNotes: [{ type: String, trim: true, maxlength: 700 }],
  methodology: { type: String, trim: true, maxlength: 1600, default: "" },
  generationSnapshot: {
    profileUpdatedAt: { type: Date, default: null },
    careerUpdatedAt: { type: Date, default: null },
    generatedAt: { type: Date, default: Date.now },
  },
  pendingRefresh: { type: Schema.Types.Mixed, default: null },
  refreshedAt: { type: Date, default: null },
}, { timestamps: true });

careerRoadmapSchema.pre("validate", function validateRoadmapStructure() {
  const stageKeys = this.stages.map((stage) => stage.stageKey);
  if (new Set(stageKeys).size !== stageKeys.length) this.invalidate("stages", "Roadmap stages cannot be duplicated");
  const activeTaskKeys = this.stages.flatMap((stage) => stage.tasks).filter((task) => !task.retired).map((task) => task.stableKey);
  if (new Set(activeTaskKeys).size !== activeTaskKeys.length) this.invalidate("stages", "Active roadmap tasks cannot be duplicated");
});

careerRoadmapSchema.index({ userId: 1, status: 1, updatedAt: -1 });
careerRoadmapSchema.index({ userId: 1, targetCareerId: 1, updatedAt: -1 });

const CareerRoadmap = mongoose.model("CareerRoadmap", careerRoadmapSchema);

module.exports = CareerRoadmap;
module.exports.ROADMAP_STAGE_KEYS = ROADMAP_STAGE_KEYS;
module.exports.ROADMAP_STATUSES = ROADMAP_STATUSES;
module.exports.ROADMAP_TASK_STATUSES = ROADMAP_TASK_STATUSES;
module.exports.ROADMAP_TASK_TYPES = ROADMAP_TASK_TYPES;
