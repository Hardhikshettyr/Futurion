const { z } = require("zod");
const { ROADMAP_STATUSES, ROADMAP_TASK_STATUSES } = require("../models/CareerRoadmap");

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Enter a valid identifier");
const clean = (max) => z.string().trim().max(max);
const required = (max) => clean(max).min(1);
const validDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD").refine((value) => {
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}, "Enter a valid calendar date");
const targetDate = z.union([
  validDate,
  z.null(),
]);

const roadmapCreateSchema = z.strictObject({
  targetCareerId: objectId,
  name: required(140).optional(),
  weeklyLearningHours: z.number().int().min(1).max(80).default(5),
  targetDate: targetDate.default(null),
});

const roadmapUpdateSchema = z.strictObject({
  name: required(140).optional(),
  weeklyLearningHours: z.number().int().min(1).max(80).optional(),
  targetDate: targetDate.optional(),
  status: z.enum(ROADMAP_STATUSES).optional(),
}).refine((value) => Object.keys(value).length > 0, "Provide at least one field to update");

const roadmapTaskUpdateSchema = z.strictObject({ status: z.enum(ROADMAP_TASK_STATUSES) });
const roadmapListQuerySchema = z.strictObject({
  status: z.enum(ROADMAP_STATUSES).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(30).default(12),
});
const roadmapRefreshConfirmSchema = z.strictObject({});
const roadmapAiRequestSchema = z.strictObject({
  question: required(1200),
  taskId: objectId.optional(),
});

const roadmapAiOutputSchema = z.strictObject({
  summary: required(1800),
  taskInsights: z.array(z.strictObject({
    taskId: objectId,
    whyItMatters: required(900),
    smallerSteps: z.array(required(500)).min(1).max(8),
    resourceConnections: z.array(z.strictObject({
      resourceId: objectId,
      explanation: required(500),
    })).max(6),
  })).max(8),
  sequenceExplanation: required(1400),
  timeAdjustments: z.array(required(700)).max(8),
  completedContributions: z.array(required(700)).max(8),
  uncertainties: z.array(required(500)).max(8),
});

module.exports = {
  objectId,
  roadmapAiOutputSchema,
  roadmapAiRequestSchema,
  roadmapCreateSchema,
  roadmapListQuerySchema,
  roadmapRefreshConfirmSchema,
  roadmapTaskUpdateSchema,
  roadmapUpdateSchema,
};
