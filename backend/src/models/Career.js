const mongoose = require("mongoose");
const {
  CAREER_CATEGORIES,
  CAREER_LEVELS,
  EDUCATION_PATHWAY_TYPES,
  EMPLOYMENT_TYPES,
  WORK_MODES,
  careerSlug,
  cleanCareerLabel,
  normalizeCareerIdentity,
} = require("../utils/careerTaxonomy");
const { PROFICIENCY_LEVELS } = require("../utils/skillTaxonomy");

const { Schema } = mongoose;

function uniqueValues(values) {
  return [...new Set((values || []).map((value) => String(value)))];
}

const educationPathwaySchema = new Schema({
  qualification: { type: String, required: true, trim: true, maxlength: 240 },
  educationLevel: { type: String, trim: true, maxlength: 100, default: "" },
  pathwayType: { type: String, enum: EDUCATION_PATHWAY_TYPES, required: true },
  description: { type: String, trim: true, maxlength: 1000, default: "" },
  disciplines: [{ type: String, trim: true, maxlength: 140 }],
}, { _id: false });

const acceptedDisciplineSchema = new Schema({
  name: { type: String, required: true, trim: true, maxlength: 140 },
  alignment: { type: String, enum: ["common", "alternative", "transferable"], default: "common" },
  notes: { type: String, trim: true, maxlength: 600, default: "" },
}, { _id: false });

const careerSkillSchema = new Schema({
  skillId: { type: Schema.Types.ObjectId, ref: "Skill", required: true },
  requiredProficiency: { type: String, enum: PROFICIENCY_LEVELS, required: true },
  rationale: { type: String, trim: true, maxlength: 600, default: "" },
}, { _id: false });

const certificationSchema = new Schema({
  name: { type: String, required: true, trim: true, maxlength: 220 },
  issuer: { type: String, trim: true, maxlength: 220, default: "" },
  description: { type: String, trim: true, maxlength: 700, default: "" },
  externalUrl: { type: String, trim: true, maxlength: 500, default: "" },
  linkVerified: { type: Boolean, default: false },
}, { _id: false });

const progressionSchema = new Schema({
  level: { type: String, enum: CAREER_LEVELS, required: true },
  roles: [{ type: String, trim: true, maxlength: 180 }],
  description: { type: String, trim: true, maxlength: 800, default: "" },
}, { _id: false });

const learningResourceSchema = new Schema({
  title: { type: String, required: true, trim: true, maxlength: 220 },
  provider: { type: String, trim: true, maxlength: 180, default: "" },
  url: { type: String, trim: true, maxlength: 500, default: "" },
  description: { type: String, trim: true, maxlength: 600, default: "" },
  verified: { type: Boolean, default: false },
}, { _id: false });

const crossDisciplinePathwaySchema = new Schema({
  sourceDisciplines: [{ type: String, trim: true, maxlength: 140 }],
  transferableStrengths: [{ type: String, trim: true, maxlength: 300 }],
  additionalSkills: [{ type: Schema.Types.ObjectId, ref: "Skill" }],
  qualificationConsiderations: [{ type: String, trim: true, maxlength: 500 }],
  investigationSteps: [{ type: String, trim: true, maxlength: 500 }],
}, { _id: false });

const careerSchema = new Schema({
  title: { type: String, required: true, trim: true, maxlength: 160 },
  normalizedTitle: { type: String, required: true, unique: true, select: false },
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
  shortDescription: { type: String, required: true, trim: true, maxlength: 360 },
  overview: { type: String, required: true, trim: true, maxlength: 4000 },
  careerCategory: { type: String, enum: CAREER_CATEGORIES, required: true },
  industry: { type: String, required: true, trim: true, maxlength: 160 },
  responsibilities: [{ type: String, trim: true, maxlength: 500 }],
  requiredEducation: { type: [educationPathwaySchema], default: [] },
  acceptedDisciplines: { type: [acceptedDisciplineSchema], default: [] },
  essentialSkills: { type: [careerSkillSchema], default: [] },
  desirableSkills: { type: [careerSkillSchema], default: [] },
  requiredCertifications: { type: [certificationSchema], default: [] },
  recommendedCertifications: { type: [certificationSchema], default: [] },
  toolsAndTechnologies: [{ type: String, trim: true, maxlength: 160 }],
  entryLevelRoles: [{ type: String, trim: true, maxlength: 180 }],
  workEnvironments: [{ type: String, trim: true, maxlength: 220 }],
  employmentTypes: [{ type: String, enum: EMPLOYMENT_TYPES }],
  workModes: [{ type: String, enum: WORK_MODES }],
  relatedCareers: [{ type: Schema.Types.ObjectId, ref: "Career" }],
  careerProgression: { type: [progressionSchema], default: [] },
  learningResources: { type: [learningResourceSchema], default: [] },
  crossDisciplinePathways: { type: [crossDisciplinePathwaySchema], default: [] },
  tags: [{ type: String, trim: true, maxlength: 100 }],
  aliases: [{ type: String, trim: true, maxlength: 160 }],
  normalizedAliases: [{ type: String, select: false }],
  featured: { type: Boolean, default: false },
  popularityRank: { type: Number, min: 0, default: 0 },
  status: { type: String, enum: ["active", "inactive"], default: "active" },
  createdBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
}, { timestamps: true });

careerSchema.pre("validate", function normalizeCareer() {
  this.title = cleanCareerLabel(this.title);
  this.normalizedTitle = normalizeCareerIdentity(this.title);
  this.slug = this.slug ? careerSlug(this.slug) : careerSlug(this.title);
  this.aliases = [...new Set((this.aliases || []).map(cleanCareerLabel).filter(Boolean))]
    .filter((alias) => normalizeCareerIdentity(alias) !== this.normalizedTitle);
  this.normalizedAliases = this.aliases.map(normalizeCareerIdentity);
  this.relatedCareers = uniqueValues(this.relatedCareers);
  this.workModes = uniqueValues(this.workModes);
  this.employmentTypes = uniqueValues(this.employmentTypes);
  this.tags = [...new Set((this.tags || []).map(cleanCareerLabel).filter(Boolean))];
  const essential = (this.essentialSkills || []).map((item) => String(item.skillId));
  const desirable = (this.desirableSkills || []).map((item) => String(item.skillId));
  if (new Set(essential).size !== essential.length) this.invalidate("essentialSkills", "Essential skill relationships cannot be duplicated");
  if (new Set(desirable).size !== desirable.length) this.invalidate("desirableSkills", "Desirable skill relationships cannot be duplicated");
  if (essential.some((skillId) => desirable.includes(skillId))) this.invalidate("desirableSkills", "A skill cannot be both essential and desirable");
  if (this._id && this.relatedCareers.some((careerId) => String(careerId) === String(this._id))) this.invalidate("relatedCareers", "A career cannot be related to itself");
});

careerSchema.index({ status: 1, careerCategory: 1, industry: 1 });
careerSchema.index({ status: 1, featured: -1, popularityRank: -1 });
careerSchema.index({ "essentialSkills.skillId": 1, status: 1 });
careerSchema.index({ "desirableSkills.skillId": 1, status: 1 });
careerSchema.index({ workModes: 1, employmentTypes: 1, status: 1 });
careerSchema.index({
  title: "text",
  aliases: "text",
  shortDescription: "text",
  overview: "text",
  industry: "text",
  tags: "text",
});

module.exports = mongoose.model("Career", careerSchema);
