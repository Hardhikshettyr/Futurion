const { z } = require("zod");
const { PROFICIENCY_LEVELS } = require("../utils/skillTaxonomy");
const { objectId } = require("./skillSchemas");

const clean = (max) => z.string().trim().min(1).max(max);
const optionalClean = (max) => z.string().trim().max(max).optional();

const groundedInsightSchema = z.strictObject({
  title: clean(120),
  explanation: clean(800),
  basis: z.array(clean(240)).min(1).max(6),
  suggestedAction: clean(500),
});

const skillAnalysisOutputSchema = z.strictObject({
  summary: clean(1600),
  strongestAreas: z.array(groundedInsightSchema).max(6),
  needsImprovement: z.array(groundedInsightSchema).max(6),
  insufficientEvidence: z.array(groundedInsightSchema).max(6),
  missingCompetencies: z.array(groundedInsightSchema).max(6),
  learningPriorities: z.array(groundedInsightSchema).max(8),
  nextSteps: z.array(clean(500)).max(10),
  strengthsToBuildUpon: z.array(groundedInsightSchema).max(6),
  dataLimitations: z.array(clean(400)).max(8),
});

const learningPrerequisiteSchema = z.strictObject({
  skillId: z.string().nullable(),
  skillName: clean(120),
  source: z.enum(["skill_library", "ai_suggestion"]),
  status: z.enum(["completed", "in_progress", "missing", "recommended"]),
  reason: clean(500),
});

const learningStageSchema = z.strictObject({
  order: z.number().int().min(1).max(12),
  title: clean(120),
  objective: clean(600),
  topics: z.array(clean(220)).min(1).max(12),
  practicalExercises: z.array(clean(500)).min(1).max(10),
  completionCriteria: z.array(clean(400)).min(1).max(8),
});

const learningStrategyOutputSchema = z.strictObject({
  title: clean(160),
  learningObjective: clean(1000),
  prerequisites: z.array(learningPrerequisiteSchema).max(12),
  stages: z.array(learningStageSchema).min(1).max(10),
  suggestedProjects: z.array(clean(700)).max(8),
  resourceRecommendations: z.array(z.strictObject({
    resourceId: clean(80),
    title: clean(200),
    reason: clean(500),
  })).max(10),
  howToDemonstrate: z.array(clean(600)).min(1).max(10),
  completionCriteria: z.array(clean(500)).min(1).max(10),
  assumptions: z.array(clean(400)).max(8),
});

const coachOutputSchema = z.strictObject({
  answer: clean(2200),
  knownFacts: z.array(z.strictObject({
    statement: clean(500),
    source: clean(180),
  })).max(10),
  suggestions: z.array(z.strictObject({
    statement: clean(600),
    rationale: clean(500),
  })).max(8),
  unavailableInformation: z.array(clean(400)).max(8),
  followUpQuestions: z.array(clean(240)).max(4),
});

const assessmentQuestionSchema = z.strictObject({
  id: clean(40),
  type: z.enum(["multiple_choice", "conceptual", "code_output", "practical", "short_answer", "coding"]),
  prompt: clean(1800),
  options: z.array(z.strictObject({ id: clean(20), text: clean(500) })).max(8),
  correctAnswer: z.string().max(4000),
  referenceAnswer: z.string().max(5000),
  explanation: clean(1200),
  rubric: z.array(z.strictObject({
    criterion: clean(400),
    maxPoints: z.number().int().min(1).max(20),
    keywords: z.array(clean(120)).max(12),
  })).max(8),
  maxPoints: z.number().int().min(1).max(50),
}).superRefine((question, context) => {
  if (question.type === "multiple_choice") {
    if (question.options.length < 2) {
      context.addIssue({ code: "custom", message: "Multiple-choice questions need at least two options", path: ["options"] });
    }
    if (!question.options.some((option) => option.id === question.correctAnswer)) {
      context.addIssue({ code: "custom", message: "The correct option must exist", path: ["correctAnswer"] });
    }
  }
  if (question.type === "code_output" && !question.correctAnswer.trim()) {
    context.addIssue({ code: "custom", message: "Output questions require a deterministic answer", path: ["correctAnswer"] });
  }
  if (!["multiple_choice", "code_output"].includes(question.type) && !question.rubric.length) {
    context.addIssue({ code: "custom", message: "Subjective questions require a rubric", path: ["rubric"] });
  }
  const rubricTotal = question.rubric.reduce((total, item) => total + item.maxPoints, 0);
  if (question.rubric.length && rubricTotal !== question.maxPoints) {
    context.addIssue({ code: "custom", message: "Rubric points must equal question maxPoints", path: ["rubric"] });
  }
});

const assessmentOutputSchema = z.strictObject({
  title: clean(180),
  instructions: z.array(clean(500)).min(1).max(8),
  questions: z.array(assessmentQuestionSchema).min(3).max(12),
}).superRefine((assessment, context) => {
  const ids = new Set();
  assessment.questions.forEach((question, index) => {
    if (ids.has(question.id)) {
      context.addIssue({ code: "custom", message: "Question identifiers must be unique", path: ["questions", index, "id"] });
    }
    ids.add(question.id);
  });
});

const subjectiveEvaluationOutputSchema = z.strictObject({
  score: z.number().min(0).max(50),
  feedback: clean(1200),
  matchedCriteria: z.array(clean(400)).max(8),
  areasToImprove: z.array(clean(500)).max(8),
});

const subjectiveEvaluationBatchOutputSchema = z.strictObject({
  evaluations: z.array(z.strictObject({
    questionId: clean(40),
    score: z.number().min(0).max(50),
    feedback: clean(1200),
    matchedCriteria: z.array(clean(400)).max(8),
    areasToImprove: z.array(clean(500)).max(8),
  })).max(12),
});

const competencyRequirementSchema = z.strictObject({
  skillId: objectId,
  requiredProficiency: z.enum(PROFICIENCY_LEVELS),
});

const analysisRequestSchema = z.strictObject({
  forceRefresh: z.boolean().default(false),
  competencyRequirements: z.array(competencyRequirementSchema).max(20).default([]),
});

const learningStrategyRequestSchema = z.strictObject({
  skillId: objectId,
  currentProficiency: z.enum(PROFICIENCY_LEVELS).nullable().optional(),
  requiredProficiency: z.enum(PROFICIENCY_LEVELS),
  preferredLearningTime: optionalClean(240),
});

const learningStrategyUpdateSchema = z.strictObject({
  status: z.enum(["draft", "saved"]).optional(),
  studentNotes: z.string().trim().max(2000).optional(),
}).refine((value) => Object.keys(value).length > 0, "Provide a status or note to update");

const coachRequestSchema = z.strictObject({
  conversationId: objectId.optional(),
  message: clean(1200),
});

const assessmentRequestSchema = z.strictObject({
  skillId: objectId,
  proficiencyLevel: z.enum(PROFICIENCY_LEVELS),
  questionCount: z.number().int().min(3).max(12).default(6),
  questionTypes: z.array(z.enum(["multiple_choice", "conceptual", "code_output", "practical", "short_answer", "coding"])).min(1).max(6).default(["multiple_choice", "conceptual", "practical"]),
});

const assessmentSubmissionSchema = z.strictObject({
  answers: z.array(z.strictObject({
    questionId: clean(40),
    answer: z.string().trim().max(6000),
  })).min(1).max(12),
});

const historyQuerySchema = z.strictObject({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(30).default(10),
});

module.exports = {
  analysisRequestSchema,
  assessmentOutputSchema,
  assessmentQuestionSchema,
  assessmentRequestSchema,
  assessmentSubmissionSchema,
  coachOutputSchema,
  coachRequestSchema,
  groundedInsightSchema,
  historyQuerySchema,
  learningStrategyOutputSchema,
  learningStrategyRequestSchema,
  learningStrategyUpdateSchema,
  skillAnalysisOutputSchema,
  subjectiveEvaluationOutputSchema,
  subjectiveEvaluationBatchOutputSchema,
};
