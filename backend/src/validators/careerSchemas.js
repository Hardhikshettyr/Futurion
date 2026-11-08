const { z } = require("zod");
const {
  CAREER_CATEGORIES,
  CAREER_LEVELS,
  EDUCATION_PATHWAY_TYPES,
  EMPLOYMENT_TYPES,
  WORK_MODES,
} = require("../utils/careerTaxonomy");
const { PROFICIENCY_LEVELS } = require("../utils/skillTaxonomy");

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Enter a valid identifier");
const clean = (max) => z.string().trim().max(max);
const required = (max) => clean(max).min(1);
const optionalUrl = z.union([z.url("Enter a valid URL"), z.literal("")]).default("");
const stringList = (maxItems, maxLength) => z.array(clean(maxLength).min(1)).max(maxItems).default([]);

const educationPathwaySchema = z.strictObject({
  qualification: required(240),
  educationLevel: clean(100).default(""),
  pathwayType: z.enum(EDUCATION_PATHWAY_TYPES),
  description: clean(1000).default(""),
  disciplines: stringList(30, 140),
});

const acceptedDisciplineSchema = z.strictObject({
  name: required(140),
  alignment: z.enum(["common", "alternative", "transferable"]).default("common"),
  notes: clean(600).default(""),
});

const careerSkillSchema = z.strictObject({
  skillId: objectId,
  requiredProficiency: z.enum(PROFICIENCY_LEVELS),
  rationale: clean(600).default(""),
});

const certificationSchema = z.strictObject({
  name: required(220),
  issuer: clean(220).default(""),
  description: clean(700).default(""),
  externalUrl: optionalUrl,
  linkVerified: z.boolean().default(false),
});

const progressionSchema = z.strictObject({
  level: z.enum(CAREER_LEVELS),
  roles: stringList(20, 180),
  description: clean(800).default(""),
});

const learningResourceSchema = z.strictObject({
  title: required(220),
  provider: clean(180).default(""),
  url: optionalUrl,
  description: clean(600).default(""),
  verified: z.boolean().default(false),
});

const crossDisciplinePathwaySchema = z.strictObject({
  sourceDisciplines: stringList(30, 140),
  transferableStrengths: stringList(20, 300),
  additionalSkills: z.array(objectId).max(30).default([]),
  qualificationConsiderations: stringList(20, 500),
  investigationSteps: stringList(20, 500),
});

const careerShape = {
  title: required(160),
  shortDescription: required(360),
  overview: required(4000),
  careerCategory: z.enum(CAREER_CATEGORIES),
  industry: required(160),
  responsibilities: stringList(30, 500),
  requiredEducation: z.array(educationPathwaySchema).max(20).default([]),
  acceptedDisciplines: z.array(acceptedDisciplineSchema).max(40).default([]),
  essentialSkills: z.array(careerSkillSchema).max(30).default([]),
  desirableSkills: z.array(careerSkillSchema).max(30).default([]),
  requiredCertifications: z.array(certificationSchema).max(20).default([]),
  recommendedCertifications: z.array(certificationSchema).max(20).default([]),
  toolsAndTechnologies: stringList(40, 160),
  entryLevelRoles: stringList(20, 180),
  workEnvironments: stringList(20, 220),
  employmentTypes: z.array(z.enum(EMPLOYMENT_TYPES)).max(7).default([]),
  workModes: z.array(z.enum(WORK_MODES)).max(3).default([]),
  relatedCareers: z.array(objectId).max(30).default([]),
  careerProgression: z.array(progressionSchema).max(10).default([]),
  learningResources: z.array(learningResourceSchema).max(30).default([]),
  crossDisciplinePathways: z.array(crossDisciplinePathwaySchema).max(20).default([]),
  tags: stringList(40, 100),
  aliases: stringList(30, 160),
  featured: z.boolean().default(false),
  popularityRank: z.number().int().min(0).max(10000).default(0),
  status: z.enum(["active", "inactive"]).default("active"),
};

function validateCareerRelationships(career, context) {
  const essential = (career.essentialSkills || []).map((item) => item.skillId);
  const desirable = (career.desirableSkills || []).map((item) => item.skillId);
  if (new Set(essential).size !== essential.length || new Set(desirable).size !== desirable.length) {
    context.addIssue({ code: "custom", message: "Skill relationships cannot be duplicated", path: ["essentialSkills"] });
  }
  const overlap = essential.find((id) => desirable.includes(id));
  if (overlap) {
    context.addIssue({ code: "custom", message: "A skill cannot be both essential and desirable", path: ["desirableSkills"] });
  }
  if (career.relatedCareers && new Set(career.relatedCareers).size !== career.relatedCareers.length) {
    context.addIssue({ code: "custom", message: "Related careers cannot be duplicated", path: ["relatedCareers"] });
  }
}

const careerCreateSchema = z.strictObject(careerShape).superRefine(validateCareerRelationships);

const careerUpdateShape = Object.fromEntries(
  Object.entries(careerShape).map(([key, schema]) => [
    key,
    (typeof schema.removeDefault === "function" ? schema.removeDefault() : schema).optional(),
  ]),
);

const careerUpdateSchema = z.strictObject(careerUpdateShape)
  .superRefine(validateCareerRelationships)
  .refine((value) => Object.keys(value).length > 0, "Provide at least one field to update");

const careerQuerySchema = z.strictObject({
  q: clean(120).optional(),
  category: z.enum(CAREER_CATEGORIES).optional(),
  industry: clean(160).optional(),
  education: clean(120).optional(),
  discipline: clean(140).optional(),
  skillId: objectId.optional(),
  workMode: z.enum(WORK_MODES).optional(),
  employmentType: z.enum(EMPLOYMENT_TYPES).optional(),
  status: z.enum(["active", "inactive"]).optional(),
  featured: z.enum(["true", "false"]).transform((value) => value === "true").optional(),
  sort: z.enum(["featured", "popular", "title_asc", "title_desc", "newest", "relevance"]).default("featured"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
});

const careerStatusSchema = z.strictObject({ status: z.enum(["active", "inactive"]) });
const relatedCareerSchema = z.strictObject({ targetCareerId: objectId });
const saveCareerSchema = z.strictObject({ selectedForComparison: z.boolean().default(false) });
const comparisonSelectionSchema = z.strictObject({ selectedForComparison: z.boolean() });
const historyQuerySchema = z.strictObject({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(30).default(12),
});

module.exports = {
  careerCreateSchema,
  careerQuerySchema,
  careerStatusSchema,
  careerUpdateSchema,
  comparisonSelectionSchema,
  historyQuerySchema,
  objectId,
  relatedCareerSchema,
  saveCareerSchema,
};
