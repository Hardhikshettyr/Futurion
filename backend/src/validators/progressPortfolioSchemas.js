const { z } = require("zod");
const { PORTFOLIO_SECTIONS, RESERVED_PORTFOLIO_SLUGS, normalizePublicSlug } = require("../utils/portfolioTaxonomy");

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Enter a valid identifier");
const publicSlugSchema = z.string().trim().min(3).max(60)
  .transform(normalizePublicSlug)
  .refine((value) => /^[a-z0-9](?:[a-z0-9-]{1,58}[a-z0-9])?$/.test(value), "Use 3–60 lowercase letters, numbers or single hyphens")
  .refine((value) => !RESERVED_PORTFOLIO_SLUGS.has(value), "This public slug is reserved");

const timelineQuerySchema = z.strictObject({
  limit: z.coerce.number().int().min(1).max(100).default(40),
});

const portfolioContentSchema = z.strictObject({
  visibleSections: z.array(z.enum(PORTFOLIO_SECTIONS)).max(PORTFOLIO_SECTIONS.length),
  selectedAchievementKeys: z.array(z.string().trim().min(1).max(120)).max(12),
});

const portfolioPublishSchema = z.strictObject({
  publicSlug: publicSlugSchema.optional(),
});

const portfolioPublicSettingsSchema = z.strictObject({
  isPublic: z.boolean().optional(),
  publicSlug: publicSlugSchema.optional(),
}).refine((value) => Object.keys(value).length > 0, "Provide a public setting to update");

const progressAiRequestSchema = z.strictObject({
  question: z.string().trim().min(1).max(1200),
  selectedCareerId: objectId.optional(),
  projectId: objectId.optional(),
});

const progressAiOutputSchema = z.strictObject({
  summary: z.string().trim().min(1).max(1800),
  documentedAchievements: z.array(z.strictObject({
    achievementKey: z.string().trim().min(1).max(120),
    explanation: z.string().trim().min(1).max(700),
  })).max(12),
  nextPriorities: z.array(z.strictObject({
    title: z.string().trim().min(1).max(260),
    rationale: z.string().trim().min(1).max(900),
    module: z.enum(["profile", "skills", "learning", "roadmaps", "careers", "opportunities"]),
    referenceId: objectId.nullable(),
  })).max(10),
  projectDescriptionSuggestions: z.array(z.strictObject({
    projectId: objectId,
    revisedDescription: z.string().trim().min(1).max(2000),
    reasoning: z.string().trim().min(1).max(700),
  })).max(8),
  careerProgress: z.array(z.strictObject({
    careerId: objectId,
    explanation: z.string().trim().min(1).max(1200),
  })).max(4),
  uncertainties: z.array(z.string().trim().min(1).max(700)).max(12),
});

module.exports = {
  portfolioContentSchema,
  portfolioPublishSchema,
  portfolioPublicSettingsSchema,
  progressAiOutputSchema,
  progressAiRequestSchema,
  publicSlugSchema,
  timelineQuerySchema,
};
