const { z } = require("zod");
const {
  PRICE_TYPES,
  RESOURCE_DIFFICULTIES,
  RESOURCE_TYPES,
  STUDENT_LEARNING_STATUSES,
} = require("../utils/learningTaxonomy");

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Enter a valid identifier");
const clean = (max) => z.string().trim().max(max);
const required = (max) => clean(max).min(1);
const httpsUrl = z.url("Enter a valid URL").refine((value) => value.startsWith("https://"), "URL must use HTTPS");
const uniqueObjectIds = z.array(objectId).max(40).default([]).refine((values) => new Set(values).size === values.length, "References cannot be duplicated");

const resourceShape = {
  title: required(220),
  description: required(2400),
  resourceType: z.enum(RESOURCE_TYPES),
  provider: required(180),
  externalUrl: httpsUrl,
  skillsCovered: uniqueObjectIds,
  prerequisites: uniqueObjectIds,
  difficulty: z.enum(RESOURCE_DIFFICULTIES),
  duration: clean(120).default(""),
  priceType: z.enum(PRICE_TYPES).default("unknown"),
  priceAmount: z.number().min(0).nullable().default(null),
  currency: clean(3).transform((value) => value.toUpperCase()).refine((value) => !value || value.length === 3, "Use a three-letter currency code").default(""),
  certificateAvailable: z.boolean().default(false),
  categoryId: objectId,
  status: z.enum(["active", "inactive"]).default("active"),
};

function validatePrice(value, context) {
  if (value.priceType === "free" && value.priceAmount !== null && value.priceAmount !== 0) {
    context.addIssue({ code: "custom", path: ["priceAmount"], message: "Free resources cannot have a positive price" });
  }
  if (value.priceAmount !== null && value.priceAmount !== undefined && value.priceType !== "free" && !value.currency) {
    context.addIssue({ code: "custom", path: ["currency"], message: "Currency is required when a price amount is provided" });
  }
}

const learningResourceCreateSchema = z.strictObject(resourceShape).superRefine(validatePrice);
const updateShape = Object.fromEntries(Object.entries(resourceShape).map(([key, schema]) => [
  key,
  (typeof schema.removeDefault === "function" ? schema.removeDefault() : schema).optional(),
]));
const learningResourceUpdateSchema = z.strictObject(updateShape)
  .superRefine(validatePrice)
  .refine((value) => Object.keys(value).length > 0, "Provide at least one field to update");

const learningResourceQuerySchema = z.strictObject({
  q: clean(120).optional(),
  resourceType: z.enum(RESOURCE_TYPES).optional(),
  skillId: objectId.optional(),
  difficulty: z.enum(RESOURCE_DIFFICULTIES).optional(),
  priceType: z.enum(PRICE_TYPES).optional(),
  provider: clean(180).optional(),
  categoryId: objectId.optional(),
  status: z.enum(["active", "inactive"]).optional(),
  sort: z.enum(["relevance", "title_asc", "title_desc", "provider", "newest", "difficulty"]).default("relevance"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
});

const learningCategoryCreateSchema = z.strictObject({
  name: required(120),
  description: clean(500).default(""),
  status: z.enum(["active", "inactive"]).default("active"),
});
const learningCategoryUpdateSchema = z.strictObject({
  name: required(120).optional(),
  description: clean(500).optional(),
  status: z.enum(["active", "inactive"]).optional(),
}).refine((value) => Object.keys(value).length > 0, "Provide at least one field to update");

const learningLibraryCreateSchema = z.strictObject({
  resourceId: objectId,
  action: z.enum(["bookmark", "add_to_library"]),
});
const learningLibraryUpdateSchema = z.strictObject({
  bookmarked: z.boolean().optional(),
  inLearningLibrary: z.boolean().optional(),
  status: z.enum(STUDENT_LEARNING_STATUSES).optional(),
}).refine((value) => Object.keys(value).length > 0, "Provide at least one field to update");
const learningLibraryQuerySchema = z.strictObject({
  scope: z.enum(["all", "bookmarked", "learning", "completed"]).default("all"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

const learningAiRequestSchema = z.strictObject({
  question: required(1200),
  resourceIds: z.array(objectId).min(1).max(4).refine((values) => new Set(values).size === values.length, "Resources cannot be duplicated").optional(),
  weeklyHours: z.number().int().min(1).max(80).optional(),
  pricePreference: z.enum(["free", "paid", "any"]).default("any"),
});

const learningAiOutputSchema = z.strictObject({
  summary: required(1800),
  resourceInsights: z.array(z.strictObject({
    resourceId: objectId,
    relevance: required(800),
    prerequisiteExplanation: required(800),
    careerConnection: required(800),
    considerations: z.array(required(500)).max(8),
  })).max(8),
  learningSequence: z.array(z.strictObject({
    resourceId: objectId,
    position: z.number().int().min(1).max(8),
    reason: required(700),
  })).max(8),
  alternatives: z.array(z.strictObject({ resourceId: objectId, reason: required(700) })).max(6),
  generalGuidance: z.array(required(700)).max(8),
  uncertainties: z.array(required(500)).max(8),
});

module.exports = {
  learningAiOutputSchema,
  learningAiRequestSchema,
  learningCategoryCreateSchema,
  learningCategoryUpdateSchema,
  learningLibraryCreateSchema,
  learningLibraryQuerySchema,
  learningLibraryUpdateSchema,
  learningResourceCreateSchema,
  learningResourceQuerySchema,
  learningResourceUpdateSchema,
  objectId,
};
