const mongoose = require("mongoose");
const { PROFICIENCY_LEVELS } = require("../utils/skillTaxonomy");
const {
  EDUCATION_LEVELS,
  OPPORTUNITY_TYPES,
  OPPORTUNITY_WORK_MODES,
  REQUIREMENT_IMPORTANCE,
  cleanOpportunityLabel,
  normalizeOpportunityIdentity,
  normalizeOpportunityUrl,
  opportunitySlug,
} = require("../utils/opportunityTaxonomy");

const { Schema } = mongoose;

const skillRequirementSchema = new Schema({
  skillId: { type: Schema.Types.ObjectId, ref: "Skill", required: true },
  minimumProficiency: { type: String, enum: PROFICIENCY_LEVELS, default: "beginner" },
  evidenceRequired: { type: String, enum: ["recorded", "demonstrated", "verified"], default: "recorded" },
  importance: { type: String, enum: REQUIREMENT_IMPORTANCE, default: "mandatory" },
  rationale: { type: String, trim: true, maxlength: 600, default: "" },
}, { _id: false });

const educationRequirementSchema = new Schema({
  acceptedLevels: [{ type: String, enum: EDUCATION_LEVELS }],
  acceptedDegrees: [{ type: String, trim: true, maxlength: 180 }],
  acceptedDisciplines: [{ type: String, trim: true, maxlength: 160 }],
  acceptedStatuses: [{ type: String, enum: ["currently_studying", "completed"] }],
  recentGraduateWithinYears: { type: Number, min: 0, max: 20, default: null },
  importance: { type: String, enum: REQUIREMENT_IMPORTANCE, default: "mandatory" },
  description: { type: String, required: true, trim: true, maxlength: 900 },
}, { _id: true });

const qualificationRequirementSchema = new Schema({
  name: { type: String, required: true, trim: true, maxlength: 220 },
  issuer: { type: String, trim: true, maxlength: 220, default: "" },
  importance: { type: String, enum: REQUIREMENT_IMPORTANCE, default: "mandatory" },
  description: { type: String, trim: true, maxlength: 700, default: "" },
}, { _id: true });

const experienceRequirementSchema = new Schema({
  minimumMonths: { type: Number, min: 0, max: 600, default: 0 },
  acceptedTypes: [{ type: String, enum: ["internship", "full_time", "part_time", "freelance", "volunteering", "research", "other"] }],
  importance: { type: String, enum: REQUIREMENT_IMPORTANCE, default: "mandatory" },
  description: { type: String, required: true, trim: true, maxlength: 900 },
}, { _id: true });

const conditionSchema = new Schema({
  label: { type: String, required: true, trim: true, maxlength: 180 },
  description: { type: String, required: true, trim: true, maxlength: 900 },
  importance: { type: String, enum: REQUIREMENT_IMPORTANCE, default: "mandatory" },
}, { _id: true });

const compensationSchema = new Schema({
  summary: { type: String, trim: true, maxlength: 500, default: "" },
  currency: { type: String, trim: true, uppercase: true, maxlength: 3, default: "" },
  minimum: { type: Number, min: 0, default: null },
  maximum: { type: Number, min: 0, default: null },
  period: { type: String, enum: ["hour", "day", "month", "year", "total", "unknown"], default: "unknown" },
}, { _id: false });

const opportunitySchema = new Schema({
  title: { type: String, required: true, trim: true, maxlength: 220 },
  organization: { type: String, required: true, trim: true, maxlength: 220 },
  normalizedIdentity: { type: String, required: true, unique: true, select: false },
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
  description: { type: String, required: true, trim: true, maxlength: 5000 },
  opportunityType: { type: String, enum: OPPORTUNITY_TYPES, required: true },
  careerIds: [{ type: Schema.Types.ObjectId, ref: "Career" }],
  requiredSkills: { type: [skillRequirementSchema], default: [] },
  requiredEducation: { type: [educationRequirementSchema], default: [] },
  requiredQualifications: { type: [qualificationRequirementSchema], default: [] },
  experienceRequirements: { type: [experienceRequirementSchema], default: [] },
  eligibleGraduationYears: [{ type: Number, min: 1950, max: 2100 }],
  graduationYearImportance: { type: String, enum: REQUIREMENT_IMPORTANCE, default: "mandatory" },
  otherConditions: { type: [conditionSchema], default: [] },
  location: { type: String, required: true, trim: true, maxlength: 240 },
  workMode: { type: String, enum: OPPORTUNITY_WORK_MODES, default: "unknown" },
  compensation: { type: compensationSchema, default: () => ({}) },
  applicationDeadline: { type: Date, default: null },
  externalApplicationUrl: { type: String, required: true, trim: true, maxlength: 800 },
  externalUrlVerified: { type: Boolean, default: false },
  sourceVerifiedAt: { type: Date, default: null },
  status: { type: String, enum: ["active", "inactive"], default: "active" },
  createdBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
}, { timestamps: true });

opportunitySchema.pre("validate", function normalizeOpportunity() {
  this.title = cleanOpportunityLabel(this.title);
  this.organization = cleanOpportunityLabel(this.organization);
  this.normalizedIdentity = normalizeOpportunityIdentity(`${this.organization}::${this.title}`);
  this.slug = this.slug ? opportunitySlug(this.slug) : opportunitySlug(`${this.organization}-${this.title}`);
  try { this.externalApplicationUrl = normalizeOpportunityUrl(this.externalApplicationUrl); }
  catch (error) { this.invalidate("externalApplicationUrl", error.message); }
  this.careerIds = [...new Map((this.careerIds || []).map((value) => [String(value), value])).values()];
  const skillIds = (this.requiredSkills || []).map((item) => String(item.skillId));
  if (new Set(skillIds).size !== skillIds.length) this.invalidate("requiredSkills", "Skill requirements cannot be duplicated");
  this.eligibleGraduationYears = [...new Set(this.eligibleGraduationYears || [])].sort();
  if (this.compensation?.minimum !== null && this.compensation?.maximum !== null && this.compensation?.minimum > this.compensation?.maximum) {
    this.invalidate("compensation", "Minimum compensation cannot exceed maximum compensation");
  }
});

opportunitySchema.index({ status: 1, applicationDeadline: 1, opportunityType: 1 });
opportunitySchema.index({ careerIds: 1, status: 1 });
opportunitySchema.index({ "requiredSkills.skillId": 1, status: 1 });
opportunitySchema.index({ location: 1, workMode: 1, status: 1 });
opportunitySchema.index({ title: "text", organization: "text", description: "text", location: "text" });

module.exports = mongoose.model("Opportunity", opportunitySchema);
