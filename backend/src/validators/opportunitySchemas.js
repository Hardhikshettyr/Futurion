const { z } = require("zod");
const { CAREER_CATEGORIES } = require("../utils/careerTaxonomy");
const { PROFICIENCY_LEVELS } = require("../utils/skillTaxonomy");
const {
  APPLICATION_STATUSES,
  EDUCATION_LEVELS,
  OPPORTUNITY_TYPES,
  OPPORTUNITY_WORK_MODES,
  REQUIREMENT_IMPORTANCE,
} = require("../utils/opportunityTaxonomy");

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Enter a valid identifier");
const clean = (max) => z.string().trim().max(max);
const required = (max) => clean(max).min(1);
const list = (max, length) => z.array(required(length)).max(max).default([]);
const calendarDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD").refine((value) => {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}, "Enter a valid calendar date");
const optionalDate = z.union([calendarDate, z.null()]).default(null);
const httpsUrl = z.url("Enter a valid URL").refine((value) => new URL(value).protocol === "https:", "URL must use HTTPS");

const skillRequirementSchema = z.strictObject({
  skillId: objectId,
  minimumProficiency: z.enum(PROFICIENCY_LEVELS).default("beginner"),
  evidenceRequired: z.enum(["recorded", "demonstrated", "verified"]).default("recorded"),
  importance: z.enum(REQUIREMENT_IMPORTANCE).default("mandatory"),
  rationale: clean(600).default(""),
});

const educationRequirementSchema = z.strictObject({
  acceptedLevels: z.array(z.enum(EDUCATION_LEVELS)).max(5).default([]),
  acceptedDegrees: list(30, 180),
  acceptedDisciplines: list(30, 160),
  acceptedStatuses: z.array(z.enum(["currently_studying", "completed"])).max(2).default([]),
  recentGraduateWithinYears: z.number().int().min(0).max(20).nullable().default(null),
  importance: z.enum(REQUIREMENT_IMPORTANCE).default("mandatory"),
  description: required(900),
});

const qualificationRequirementSchema = z.strictObject({
  name: required(220), issuer: clean(220).default(""),
  importance: z.enum(REQUIREMENT_IMPORTANCE).default("mandatory"),
  description: clean(700).default(""),
});

const experienceRequirementSchema = z.strictObject({
  minimumMonths: z.number().int().min(0).max(600).default(0),
  acceptedTypes: z.array(z.enum(["internship", "full_time", "part_time", "freelance", "volunteering", "research", "other"])).max(7).default([]),
  importance: z.enum(REQUIREMENT_IMPORTANCE).default("mandatory"),
  description: required(900),
});

const conditionSchema = z.strictObject({
  label: required(180), description: required(900),
  importance: z.enum(REQUIREMENT_IMPORTANCE).default("mandatory"),
});

const compensationSchema = z.strictObject({
  summary: clean(500).default(""),
  currency: z.string().trim().toUpperCase().regex(/^$|^[A-Z]{3}$/, "Use a three-letter currency code").default(""),
  minimum: z.number().min(0).nullable().default(null),
  maximum: z.number().min(0).nullable().default(null),
  period: z.enum(["hour", "day", "month", "year", "total", "unknown"]).default("unknown"),
});

const opportunityFields = {
  title: required(220), organization: required(220), description: required(5000),
  opportunityType: z.enum(OPPORTUNITY_TYPES),
  careerIds: z.array(objectId).max(30).default([]),
  requiredSkills: z.array(skillRequirementSchema).max(50).default([]),
  requiredEducation: z.array(educationRequirementSchema).max(20).default([]),
  requiredQualifications: z.array(qualificationRequirementSchema).max(30).default([]),
  experienceRequirements: z.array(experienceRequirementSchema).max(20).default([]),
  eligibleGraduationYears: z.array(z.number().int().min(1950).max(2100)).max(30).default([]),
  graduationYearImportance: z.enum(REQUIREMENT_IMPORTANCE).default("mandatory"),
  otherConditions: z.array(conditionSchema).max(30).default([]),
  location: required(240), workMode: z.enum(OPPORTUNITY_WORK_MODES).default("unknown"),
  compensation: compensationSchema.default({}), applicationDeadline: optionalDate,
  externalApplicationUrl: httpsUrl, externalUrlVerified: z.boolean().default(false),
  status: z.enum(["active", "inactive"]).default("active"),
};

const opportunityCreateSchema = z.strictObject(opportunityFields);
const opportunityUpdateSchema = z.strictObject(Object.fromEntries(Object.entries(opportunityFields).map(([key, schema]) => [key, schema.optional()])))
  .refine((value) => Object.keys(value).length > 0, "Provide at least one field to update");
const opportunityStatusSchema = z.strictObject({ status: z.enum(["active", "inactive"]) });

const opportunityQuerySchema = z.strictObject({
  q: clean(200).default(""), opportunityType: z.enum(OPPORTUNITY_TYPES).optional(),
  careerCategory: z.enum(CAREER_CATEGORIES).optional(), location: clean(160).default(""),
  workMode: z.enum(OPPORTUNITY_WORK_MODES).optional(), skillId: objectId.optional(),
  deadline: z.enum(["open", "upcoming_7", "upcoming_30", "upcoming_90", "no_deadline", "expired", "all"]).default("open"),
  sort: z.enum(["deadline", "newest", "title_asc", "relevance"]).default("deadline"),
  status: z.enum(["active", "inactive"]).optional(),
  page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(50).default(12),
});

const applicationCreateSchema = z.strictObject({
  opportunityId: objectId,
  action: z.enum(["save", "track"]).default("save"),
});
const applicationUpdateSchema = z.strictObject({
  status: z.enum(APPLICATION_STATUSES).optional(),
  applicationDate: z.union([calendarDate, z.null()]).optional(),
  notes: clean(3000).optional(),
  inTracker: z.boolean().optional(),
  saved: z.boolean().optional(),
}).refine((value) => Object.keys(value).length > 0, "Provide at least one field to update");
const applicationQuerySchema = z.strictObject({
  scope: z.enum(["all", "saved", "tracked"]).default("all"),
  status: z.enum(APPLICATION_STATUSES).optional(),
  page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(50).default(20),
});
const opportunityAiRequestSchema = z.strictObject({ question: required(1200) });
const opportunityAiOutputSchema = z.strictObject({
  summary: required(1800),
  eligibilityExplanations: z.array(z.strictObject({ requirementKey: required(200), explanation: required(900) })).max(30),
  missingRequirementActions: z.array(z.strictObject({ requirementKey: required(200), actions: z.array(required(500)).min(1).max(8) })).max(20),
  opportunityExplanation: required(1800),
  preparationSteps: z.array(z.strictObject({
    title: required(300), rationale: required(900), roadmapId: objectId.nullable(), resourceIds: z.array(objectId).max(8),
  })).max(12),
  applicationPreparation: z.array(required(700)).max(12),
  uncertainties: z.array(required(700)).max(12),
});

module.exports = {
  applicationCreateSchema,
  applicationQuerySchema,
  applicationUpdateSchema,
  objectId,
  opportunityAiOutputSchema,
  opportunityAiRequestSchema,
  opportunityCreateSchema,
  opportunityQuerySchema,
  opportunityStatusSchema,
  opportunityUpdateSchema,
};
