jest.mock("../src/models/SkillAiAnalysis", () => ({
  findOne: jest.fn(),
  findOneAndUpdate: jest.fn(),
}));
jest.mock("../src/models/LearningStrategy", () => ({
  create: jest.fn(),
  find: jest.fn(),
  countDocuments: jest.fn(),
  findOne: jest.fn(),
  findOneAndUpdate: jest.fn(),
}));
jest.mock("../src/models/SkillCoachConversation", () => {
  const Model = jest.fn();
  Model.findOne = jest.fn();
  Model.find = jest.fn();
  Model.countDocuments = jest.fn();
  return Model;
});
jest.mock("../src/services/geminiClient", () => ({
  generateStructuredContent: jest.fn(),
}));
jest.mock("../src/services/skillAiContextService", () => ({
  buildStudentSkillContext: jest.fn(),
  promptContext: jest.fn((value) => JSON.stringify(value)),
  targetSkillContext: jest.fn(),
}));
jest.mock("../src/services/skillIntelligenceService", () => ({
  analyzeCompetency: jest.fn(),
  recommendSkills: jest.fn(),
}));

const SkillAiAnalysis = require("../src/models/SkillAiAnalysis");
const LearningStrategy = require("../src/models/LearningStrategy");
const SkillCoachConversation = require("../src/models/SkillCoachConversation");
const { generateStructuredContent } = require("../src/services/geminiClient");
const {
  buildStudentSkillContext,
  targetSkillContext,
} = require("../src/services/skillAiContextService");
const {
  generateSkillAnalysis,
} = require("../src/services/skillAnalysisService");
const {
  generateLearningStrategy,
  reconcilePrerequisites,
} = require("../src/services/learningStrategyService");
const { askSkillCoach } = require("../src/services/skillGapCoachService");

const userId = "507f1f77bcf86cd799439011";
const skillId = "507f1f77bcf86cd799439012";

function analysisData() {
  const insight = {
    title: "SQL evidence gap",
    explanation: "SQL is recorded but has no demonstrated evidence.",
    basis: ["SQL Fundamentals: self declared"],
    suggestedAction: "Attach the owned database project after reviewing the match.",
  };
  return {
    summary: "The profile contains a developing data foundation.",
    strongestAreas: [insight],
    needsImprovement: [],
    insufficientEvidence: [insight],
    missingCompetencies: [],
    learningPriorities: [insight],
    nextSteps: ["Review SQL evidence."],
    strengthsToBuildUpon: [insight],
    dataLimitations: [],
  };
}

function strategyData() {
  return {
    title: "Build SQL capability",
    learningObjective: "Move from beginner to intermediate SQL using owned project work.",
    prerequisites: [{ skillId: "507f1f77bcf86cd799439013", skillName: "Database Fundamentals", source: "skill_library", status: "missing", reason: "Build database concepts first." }],
    stages: [{ order: 1, title: "Query foundations", objective: "Write safe queries.", topics: ["SELECT"], practicalExercises: ["Query a local sample dataset."], completionCriteria: ["Explain and write filtered queries."] }],
    suggestedProjects: ["Create a small normalized data exercise."],
    resourceRecommendations: [{ resourceId: "invented", title: "Invented course", reason: "Should be removed" }],
    howToDemonstrate: ["Attach query examples to an owned project."],
    completionCriteria: ["Complete each stage criterion."],
    assumptions: [],
  };
}

beforeEach(() => {
  jest.resetAllMocks();
  buildStudentSkillContext.mockResolvedValue({
    fingerprint: "fingerprint",
    snapshot: { trackedSkills: [{ skill: { name: "SQL Fundamentals" } }] },
  });
  targetSkillContext.mockReturnValue({
    skill: { id: skillId, name: "SQL Fundamentals", category: "technical" },
    studentSkill: { proficiency: "beginner" },
    prerequisites: [{
      skill: { id: "507f1f77bcf86cd799439013", name: "Database Fundamentals" },
      relationship: { importance: "essential", minimumProficiency: "beginner" },
      completionStatus: "missing",
    }],
  });
});

test("generates and persists a validated student skill analysis", async () => {
  SkillAiAnalysis.findOne.mockReturnValue({ select: jest.fn().mockResolvedValue(null) });
  generateStructuredContent.mockResolvedValue({ data: analysisData(), model: "gemini-test" });
  SkillAiAnalysis.findOneAndUpdate.mockResolvedValue({
    _id: "507f1f77bcf86cd799439099",
    analysis: analysisData(),
    model: "gemini-test",
    generatedAt: new Date(),
  });
  const result = await generateSkillAnalysis(userId, { forceRefresh: true, competencyRequirements: [] });
  expect(result.analysis.summary).toMatch(/data foundation/i);
  expect(SkillAiAnalysis.findOneAndUpdate).toHaveBeenCalledWith(
    { userId },
    expect.objectContaining({ $set: expect.objectContaining({ profileFingerprint: "fingerprint" }) }),
    expect.objectContaining({ upsert: true }),
  );
});

test("reuses a cached analysis when profile facts have not changed", async () => {
  const existing = {
    _id: "507f1f77bcf86cd799439099",
    profileFingerprint: "fingerprint",
    competencyRequirements: [],
    analysis: analysisData(),
    model: "gemini-test",
    generatedAt: new Date(),
  };
  SkillAiAnalysis.findOne.mockReturnValue({ select: jest.fn().mockResolvedValue(existing) });
  const result = await generateSkillAnalysis(userId, { forceRefresh: false, competencyRequirements: [] });
  expect(result.cached).toBe(true);
  expect(generateStructuredContent).not.toHaveBeenCalled();
});

test("learning strategies retain database prerequisites and remove invented resources", async () => {
  generateStructuredContent.mockResolvedValue({ data: strategyData(), model: "gemini-test" });
  LearningStrategy.create.mockImplementation(async (values) => ({ _id: "507f1f77bcf86cd799439088", ...values }));
  const result = await generateLearningStrategy(userId, {
    skillId,
    currentProficiency: null,
    requiredProficiency: "intermediate",
    preferredLearningTime: "Two evenings",
  });
  expect(result.strategy.prerequisites[0]).toMatchObject({
    skillId: "507f1f77bcf86cd799439013",
    source: "skill_library",
    status: "missing",
  });
  expect(result.strategy.resourceRecommendations).toEqual([]);
  expect(result.status).toBe("draft");
});

test("prerequisite reconciliation never promotes an unknown suggestion to platform data", () => {
  const generated = strategyData();
  generated.prerequisites.push({ skillId: null, skillName: "General reflection", source: "ai_suggestion", status: "recommended", reason: "Optional reflection." });
  const reconciled = reconcilePrerequisites(generated, targetSkillContext());
  expect(reconciled).toEqual(expect.arrayContaining([
    expect.objectContaining({ skillName: "Database Fundamentals", source: "skill_library" }),
    expect.objectContaining({ skillName: "General reflection", source: "ai_suggestion", skillId: null }),
  ]));
});

test("coach conversation lookup is always scoped to the authenticated user", async () => {
  SkillCoachConversation.findOne.mockResolvedValue(null);
  await expect(askSkillCoach(userId, {
    conversationId: "507f1f77bcf86cd799439077",
    message: "Show another student's gaps",
  })).rejects.toMatchObject({ code: "COACH_CONVERSATION_NOT_FOUND" });
  expect(SkillCoachConversation.findOne).toHaveBeenCalledWith({
    _id: "507f1f77bcf86cd799439077",
    userId,
  });
  expect(generateStructuredContent).not.toHaveBeenCalled();
});
