const { z } = require("zod");
const { COMPARISON_DIMENSIONS } = require("../models/CareerComparison");
const { LEARNING_PREFERENCES } = require("../models/CareerScenario");
const { PROFICIENCY_LEVELS } = require("../utils/skillTaxonomy");
const { objectId } = require("./careerSchemas");

const required = (max) => z.string().trim().min(1).max(max);
const optional = (max) => z.string().trim().max(max).default("");
const uniqueIds = (minimum, maximum, label) => z.array(objectId).min(minimum).max(maximum)
  .refine((values) => new Set(values).size === values.length, `${label} cannot contain duplicates`);

const comparisonSettingsSchema = z.strictObject({
  dimensions: z.array(z.enum(COMPARISON_DIMENSIONS)).min(1).max(COMPARISON_DIMENSIONS.length)
    .refine((values) => new Set(values).size === values.length, "Comparison dimensions cannot be duplicated")
    .default(COMPARISON_DIMENSIONS),
});

const comparisonCreateSchema = z.strictObject({
  name: required(120),
  careerIds: uniqueIds(2, 4, "Career selection"),
  comparisonSettings: comparisonSettingsSchema.default({ dimensions: COMPARISON_DIMENSIONS }),
});

const comparisonUpdateSchema = z.strictObject({
  name: required(120).optional(),
  careerIds: uniqueIds(2, 4, "Career selection").optional(),
  comparisonSettings: comparisonSettingsSchema.optional(),
}).refine((value) => Object.keys(value).length > 0, "Provide at least one field to update");

const comparisonAnalyzeSchema = z.strictObject({
  careerIds: uniqueIds(2, 4, "Career selection"),
});

const comparisonAiRequestSchema = z.strictObject({
  careerIds: uniqueIds(2, 4, "Career selection"),
  question: required(1200),
});

const hypotheticalSkillSchema = z.strictObject({
  skillId: objectId,
  proficiency: z.enum(PROFICIENCY_LEVELS),
});

const targetDateSchema = z.union([
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD for the target date"),
  z.null(),
]).default(null);

const scenarioShape = {
  name: required(120),
  description: optional(1600),
  targetCareerId: objectId,
  startingPointType: z.enum(["existing_profile", "custom_hypothetical"]).default("existing_profile"),
  hypotheticalSkills: z.array(hypotheticalSkillSchema).max(40)
    .refine((values) => new Set(values.map((item) => item.skillId)).size === values.length, "Hypothetical skills cannot be duplicated")
    .default([]),
  hypotheticalQualifications: z.array(required(240)).max(20)
    .refine((values) => new Set(values.map((item) => item.toLowerCase())).size === values.length, "Hypothetical qualifications cannot be duplicated")
    .default([]),
  weeklyLearningHours: z.number().int().min(1).max(80).default(5),
  learningPreferences: z.array(z.enum(LEARNING_PREFERENCES)).min(1).max(LEARNING_PREFERENCES.length)
    .refine((values) => new Set(values).size === values.length, "Learning preferences cannot be duplicated")
    .default(["mixed"]),
  targetDate: targetDateSchema,
  constraints: optional(2000),
  status: z.enum(["active", "archived"]).default("active"),
};

const scenarioCreateSchema = z.strictObject(scenarioShape);
const scenarioUpdateShape = Object.fromEntries(
  Object.entries(scenarioShape).map(([key, schema]) => [
    key,
    (typeof schema.removeDefault === "function" ? schema.removeDefault() : schema).optional(),
  ]),
);
const scenarioUpdateSchema = z.strictObject(scenarioUpdateShape)
  .refine((value) => Object.keys(value).length > 0, "Provide at least one field to update");

const scenarioCompareSchema = z.strictObject({
  scenarioIds: uniqueIds(2, 4, "Scenario selection"),
});

const scenarioAiRequestSchema = z.strictObject({
  scenarioIds: uniqueIds(1, 4, "Scenario selection"),
  question: required(1200),
});

const scenarioDuplicateSchema = z.strictObject({
  name: required(120).optional(),
});

const decisionListQuerySchema = z.strictObject({
  status: z.enum(["active", "archived"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(30).default(12),
});

const comparisonListQuerySchema = z.strictObject({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(30).default(12),
});

const comparisonAiCareerSchema = z.strictObject({
  careerId: objectId,
  strongestAlignment: required(700),
  existingStrengths: z.array(required(400)).max(8),
  majorGaps: z.array(required(400)).max(8),
  educationConsiderations: z.array(required(500)).max(8),
  preparationRequirements: z.array(required(500)).max(8),
  advantages: z.array(required(400)).max(6),
  tradeoffs: z.array(required(500)).max(6),
  uncertainties: z.array(required(400)).max(6),
});

const comparisonAiOutputSchema = z.strictObject({
  summary: required(2400),
  careerInsights: z.array(comparisonAiCareerSchema).min(2).max(4),
  crossCareerTradeoffs: z.array(required(700)).max(10),
  questionsToConsider: z.array(required(400)).max(8),
  dataLimitations: z.array(required(400)).max(8),
});

const scenarioAiItemSchema = z.strictObject({
  scenarioId: objectId,
  targetCareerId: objectId,
  existingStrengths: z.array(required(400)).max(8),
  hypotheticalAssumptions: z.array(required(500)).max(10),
  remainingGaps: z.array(required(400)).max(8),
  educationConsiderations: z.array(required(500)).max(8),
  preparationTradeoffs: z.array(required(600)).max(8),
  practicalProjectSuggestions: z.array(required(600)).max(8),
  uncertainties: z.array(required(400)).max(8),
});

const scenarioAiOutputSchema = z.strictObject({
  summary: required(2400),
  scenarioInsights: z.array(scenarioAiItemSchema).min(1).max(4),
  crossScenarioTradeoffs: z.array(required(700)).max(10),
  assumptionsToReconsider: z.array(required(500)).max(8),
  questionsToConsider: z.array(required(400)).max(8),
  nextSteps: z.array(required(500)).max(8),
});

module.exports = {
  comparisonAiOutputSchema,
  comparisonAiRequestSchema,
  comparisonAnalyzeSchema,
  comparisonCreateSchema,
  comparisonListQuerySchema,
  comparisonUpdateSchema,
  decisionListQuerySchema,
  scenarioAiOutputSchema,
  scenarioAiRequestSchema,
  scenarioCompareSchema,
  scenarioCreateSchema,
  scenarioDuplicateSchema,
  scenarioUpdateSchema,
};
