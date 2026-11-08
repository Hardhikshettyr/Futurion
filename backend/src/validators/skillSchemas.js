const { z } = require("zod");
const {
  DIFFICULTY_LEVELS,
  EVIDENCE_TYPES,
  LEARNING_STATUSES,
  PROFICIENCY_LEVELS,
  SKILL_CATEGORIES,
} = require("../utils/skillTaxonomy");

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Enter a valid identifier");
const cleanString = (max) => z.string().trim().max(max);
const optionalDate = z.union([z.iso.date(), z.literal(""), z.null()]).optional();
const optionalUrl = z.union([z.url("Enter a valid URL"), z.literal("")]).optional();
const pageNumber = z.coerce.number().int().min(1).default(1);
const pageSize = z.coerce.number().int().min(1).max(50).default(20);
const prerequisiteRuleSchema = z.strictObject({
  skillId: objectId,
  importance: z.enum(["essential", "recommended"]).default("essential"),
  minimumProficiency: z.enum(PROFICIENCY_LEVELS).default("beginner"),
  requiredForLevels: z.array(z.enum(PROFICIENCY_LEVELS)).max(4).default([]),
});

const libraryQuerySchema = z.strictObject({
  q: cleanString(100).optional(),
  category: z.enum(SKILL_CATEGORIES).optional(),
  subcategory: cleanString(120).optional(),
  status: z.enum(["active", "inactive"]).optional(),
  page: pageNumber,
  limit: pageSize,
});

const adminSkillCreateSchema = z.strictObject({
  name: cleanString(120).min(2, "Skill name is required"),
  description: cleanString(1600).default(""),
  category: z.enum(SKILL_CATEGORIES),
  subcategory: cleanString(120).default(""),
  aliases: z.array(cleanString(120).min(1)).max(30).default([]),
  parentSkillId: objectId.nullable().default(null),
  relatedSkills: z.array(objectId).max(50).default([]),
  prerequisites: z.array(objectId).max(50).default([]),
  prerequisiteRules: z.array(prerequisiteRuleSchema).max(50).default([]),
  difficultyLevel: z.enum(DIFFICULTY_LEVELS).default("foundational"),
  status: z.enum(["active", "inactive"]).default("active"),
});

const adminSkillUpdateSchema = adminSkillCreateSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  "Provide at least one field to update",
);

const skillStatusSchema = z.strictObject({
  status: z.enum(["active", "inactive"]),
});

const skillRelationshipSchema = z.strictObject({
  relationshipType: z.enum(["related", "prerequisite"]),
  targetSkillId: objectId,
  importance: z.enum(["essential", "recommended"]).optional(),
  minimumProficiency: z.enum(PROFICIENCY_LEVELS).optional(),
  requiredForLevels: z.array(z.enum(PROFICIENCY_LEVELS)).max(4).optional(),
}).superRefine((value, context) => {
  if (
    value.relationshipType === "related" &&
    (value.importance || value.minimumProficiency || value.requiredForLevels)
  ) {
    context.addIssue({
      code: "custom",
      message: "Prerequisite settings are only valid for prerequisite relationships",
    });
  }
});

const studentSkillQuerySchema = z.strictObject({
  q: cleanString(100).optional(),
  category: z.enum(SKILL_CATEGORIES).optional(),
  proficiency: z.enum(PROFICIENCY_LEVELS).optional(),
  evidenceStatus: z.enum([
    "self_declared",
    "currently_learning",
    "demonstrated",
    "verified",
  ]).optional(),
  learningStatus: z.enum(LEARNING_STATUSES).optional(),
  sort: z.enum(["updated_desc", "name_asc", "proficiency_desc"]).default("updated_desc"),
  page: pageNumber,
  limit: pageSize,
});

const studentSkillCreateSchema = z.strictObject({
  skillId: objectId,
  proficiency: z.enum(PROFICIENCY_LEVELS),
  learningStatus: z.enum(LEARNING_STATUSES).default("not_started"),
  confidenceLevel: z.number().int().min(1).max(5).nullable().optional(),
  description: cleanString(1000).default(""),
  notes: cleanString(2000).default(""),
  startedAt: optionalDate,
  lastPracticedAt: optionalDate,
  acquiredAt: optionalDate,
});

const studentSkillUpdateSchema = z.strictObject({
  proficiency: z.enum(PROFICIENCY_LEVELS).optional(),
  learningStatus: z.enum(LEARNING_STATUSES).optional(),
  confidenceLevel: z.number().int().min(1).max(5).nullable().optional(),
  description: cleanString(1000).optional(),
  notes: cleanString(2000).optional(),
  startedAt: optionalDate,
  lastPracticedAt: optionalDate,
  acquiredAt: optionalDate,
}).refine((value) => Object.keys(value).length > 0, "Provide at least one field to update");

const evidenceCreateSchema = z.strictObject({
  evidenceType: z.enum(EVIDENCE_TYPES),
  referenceId: objectId.nullable().optional(),
  description: cleanString(1000).default(""),
  externalUrl: optionalUrl,
  date: optionalDate,
}).refine(
  (value) => Boolean(value.referenceId || value.description || value.externalUrl),
  "Provide linked evidence, a description, or an external URL",
);

const competencyAnalysisSchema = z.strictObject({
  requirements: z.array(
    z.strictObject({
      skillId: objectId,
      requiredProficiency: z.enum(PROFICIENCY_LEVELS),
    }),
  ).min(1).max(50).superRefine((requirements, context) => {
    const seen = new Set();
    requirements.forEach((requirement, index) => {
      if (seen.has(requirement.skillId)) {
        context.addIssue({
          code: "custom",
          message: "Each required skill can appear only once",
          path: [index, "skillId"],
        });
      }
      seen.add(requirement.skillId);
    });
  }),
});

module.exports = {
  adminSkillCreateSchema,
  adminSkillUpdateSchema,
  competencyAnalysisSchema,
  evidenceCreateSchema,
  libraryQuerySchema,
  objectId,
  skillRelationshipSchema,
  skillStatusSchema,
  studentSkillCreateSchema,
  studentSkillQuerySchema,
  studentSkillUpdateSchema,
};
