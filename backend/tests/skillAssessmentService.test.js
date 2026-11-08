jest.mock("../src/models/SkillAssessment", () => ({
  create: jest.fn(),
  findOne: jest.fn(),
  find: jest.fn(),
  countDocuments: jest.fn(),
}));
jest.mock("../src/services/geminiClient", () => ({ generateStructuredContent: jest.fn() }));
jest.mock("../src/services/skillAiContextService", () => ({
  buildStudentSkillContext: jest.fn(),
  promptContext: jest.fn((value) => JSON.stringify(value)),
  targetSkillContext: jest.fn(),
}));
jest.mock("../src/services/skillAssessmentEvaluationService", () => ({
  evaluateAssessmentAnswers: jest.fn(),
}));

const SkillAssessment = require("../src/models/SkillAssessment");
const { generateStructuredContent } = require("../src/services/geminiClient");
const { buildStudentSkillContext, targetSkillContext } = require("../src/services/skillAiContextService");
const { evaluateAssessmentAnswers } = require("../src/services/skillAssessmentEvaluationService");
const {
  generateAssessment,
  getAssessment,
  submitAssessment,
} = require("../src/services/skillAssessmentService");

const userId = "507f1f77bcf86cd799439011";
const skillId = "507f1f77bcf86cd799439012";
const assessmentId = "507f1f77bcf86cd799439013";

function generatedAssessment() {
  return {
    title: "Beginner SQL check",
    instructions: ["Answer every question."],
    questions: [1, 2, 3].map((number) => ({
      id: `q${number}`,
      type: "multiple_choice",
      prompt: `Question ${number}`,
      options: [{ id: "a", text: "Correct" }, { id: "b", text: "Incorrect" }],
      correctAnswer: "a",
      referenceAnswer: "Correct",
      explanation: "Option A is correct.",
      rubric: [],
      maxPoints: 2,
    })),
  };
}

beforeEach(() => {
  jest.resetAllMocks();
  buildStudentSkillContext.mockResolvedValue({ snapshot: {} });
  targetSkillContext.mockReturnValue({
    skill: { id: skillId, name: "SQL Fundamentals", category: "technical" },
    studentSkill: null,
    prerequisites: [],
  });
});

test("generates a level-specific assessment without exposing answers", async () => {
  generateStructuredContent.mockResolvedValue({ data: generatedAssessment(), model: "gemini-test" });
  SkillAssessment.create.mockImplementation(async (values) => ({ _id: assessmentId, status: "generated", ...values }));
  const result = await generateAssessment(userId, {
    skillId,
    proficiencyLevel: "beginner",
    questionCount: 3,
    questionTypes: ["multiple_choice"],
  });
  expect(result.questions).toHaveLength(3);
  expect(result.questions[0].correctAnswer).toBeUndefined();
  expect(result.questions[0].explanation).toBeUndefined();
  expect(result.status).toBe("generated");
});

test("submits results separately without changing StudentSkill proficiency or evidence", async () => {
  const record = {
    _id: assessmentId,
    userId,
    skillId,
    skillName: "SQL Fundamentals",
    proficiencyLevel: "beginner",
    title: "Beginner SQL check",
    instructions: [],
    questions: generatedAssessment().questions,
    status: "generated",
    maxScore: 6,
    model: "gemini-test",
    save: jest.fn().mockResolvedValue(undefined),
  };
  SkillAssessment.findOne.mockResolvedValue(record);
  evaluateAssessmentAnswers.mockResolvedValue({
    answers: generatedAssessment().questions.map((question) => ({ questionId: question.id, answer: "a", score: 2, maxPoints: 2, correct: true, feedback: "Correct", matchedCriteria: [], areasToImprove: [] })),
    score: 6,
    maxScore: 6,
    percentage: 100,
    evaluationModel: "",
  });
  const result = await submitAssessment(userId, assessmentId, [{ questionId: "q1", answer: "a" }]);
  expect(SkillAssessment.findOne).toHaveBeenCalledWith({ _id: assessmentId, userId });
  expect(record.save).toHaveBeenCalled();
  expect(result).toMatchObject({ status: "submitted", percentage: 100 });
  expect(record).not.toHaveProperty("proficiency");
  expect(record).not.toHaveProperty("evidenceStatus");
});

test("assessment history lookup is scoped to the authenticated user", async () => {
  SkillAssessment.findOne.mockReturnValue({ lean: jest.fn().mockResolvedValue(null) });
  await expect(getAssessment(userId, assessmentId)).rejects.toMatchObject({ code: "ASSESSMENT_NOT_FOUND" });
  expect(SkillAssessment.findOne).toHaveBeenCalledWith({ _id: assessmentId, userId });
});
