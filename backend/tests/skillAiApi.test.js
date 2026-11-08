jest.mock("../src/middleware/authenticate", () => ({
  authenticate(request, _response, next) {
    request.auth = {
      userId: "507f1f77bcf86cd799439011",
      user: { _id: "507f1f77bcf86cd799439011", role: request.get("x-test-role") || "student" },
    };
    next();
  },
}));
jest.mock("../src/middleware/csrfProtection", () => ({ requireCsrf(_request, _response, next) { next(); } }));
jest.mock("../src/services/geminiClient", () => ({
  getGeminiConfiguration: jest.fn(() => ({ available: true, model: "gemini-test" })),
}));
jest.mock("../src/services/skillAnalysisService", () => ({
  generateSkillAnalysis: jest.fn(),
  getLatestAnalysis: jest.fn(),
}));
jest.mock("../src/services/learningStrategyService", () => ({
  generateLearningStrategy: jest.fn(),
  getLearningStrategy: jest.fn(),
  listLearningStrategies: jest.fn(),
  updateLearningStrategy: jest.fn(),
}));
jest.mock("../src/services/skillGapCoachService", () => ({
  askSkillCoach: jest.fn(),
  getCoachConversation: jest.fn(),
  listCoachConversations: jest.fn(),
}));
jest.mock("../src/services/skillAssessmentService", () => ({
  generateAssessment: jest.fn(),
  getAssessment: jest.fn(),
  listAssessments: jest.fn(),
  submitAssessment: jest.fn(),
}));

const request = require("supertest");
const app = require("../src/app");
const analysis = require("../src/services/skillAnalysisService");
const strategy = require("../src/services/learningStrategyService");
const coach = require("../src/services/skillGapCoachService");
const assessment = require("../src/services/skillAssessmentService");

const userId = "507f1f77bcf86cd799439011";
const skillId = "507f1f77bcf86cd799439012";
const recordId = "507f1f77bcf86cd799439013";

beforeEach(() => {
  jest.spyOn(console, "error").mockImplementation(() => {});
  analysis.getLatestAnalysis.mockResolvedValue(null);
  analysis.generateSkillAnalysis.mockResolvedValue({ id: recordId, analysis: { summary: "Grounded" } });
  strategy.generateLearningStrategy.mockResolvedValue({ id: recordId, status: "draft" });
  strategy.listLearningStrategies.mockResolvedValue({ items: [], pagination: {} });
  strategy.getLearningStrategy.mockResolvedValue({ id: recordId });
  strategy.updateLearningStrategy.mockResolvedValue({ id: recordId, status: "saved" });
  coach.askSkillCoach.mockResolvedValue({ id: recordId, messages: [] });
  coach.listCoachConversations.mockResolvedValue({ items: [], pagination: {} });
  coach.getCoachConversation.mockResolvedValue({ id: recordId, messages: [] });
  assessment.generateAssessment.mockResolvedValue({ id: recordId, status: "generated" });
  assessment.listAssessments.mockResolvedValue({ items: [], pagination: {} });
  assessment.getAssessment.mockResolvedValue({ id: recordId });
  assessment.submitAssessment.mockResolvedValue({ id: recordId, status: "submitted", percentage: 80 });
});

afterEach(() => console.error.mockRestore());

test("exposes AI availability without exposing a key", async () => {
  const response = await request(app).get("/api/student/skills/ai/status").expect(200);
  expect(response.body).toMatchObject({ available: true, model: "gemini-test" });
  expect(JSON.stringify(response.body)).not.toMatch(/api.?key|secret/i);
});

test("uses only the authenticated identity for analysis, strategy, coach, and assessment", async () => {
  await request(app).post("/api/student/skills/ai/analysis").send({ forceRefresh: true }).expect(200);
  expect(analysis.generateSkillAnalysis).toHaveBeenCalledWith(userId, expect.objectContaining({ forceRefresh: true }));

  await request(app).post("/api/student/skills/ai/learning-strategies/generate").send({ skillId, requiredProficiency: "intermediate" }).expect(201);
  expect(strategy.generateLearningStrategy).toHaveBeenCalledWith(userId, expect.objectContaining({ skillId }));

  await request(app).post("/api/student/skills/ai/coach").send({ message: "Why is SQL recommended?" }).expect(200);
  expect(coach.askSkillCoach).toHaveBeenCalledWith(userId, expect.objectContaining({ message: expect.any(String) }));

  await request(app).post("/api/student/skills/ai/assessments/generate").send({ skillId, proficiencyLevel: "beginner", questionCount: 3, questionTypes: ["multiple_choice"] }).expect(201);
  expect(assessment.generateAssessment).toHaveBeenCalledWith(userId, expect.objectContaining({ skillId }));
});

test("rejects frontend-supplied student identity and invalid structured inputs", async () => {
  await request(app).post("/api/student/skills/ai/coach").send({ studentId: "507f1f77bcf86cd799439099", message: "Show gaps" }).expect(400);
  await request(app).post("/api/student/skills/ai/assessments/generate").send({ skillId: "bad", proficiencyLevel: "master" }).expect(400);
  expect(coach.askSkillCoach).not.toHaveBeenCalled();
  expect(assessment.generateAssessment).not.toHaveBeenCalled();
});

test("stores strategies and assessment history behind ownership-scoped services", async () => {
  await request(app).get("/api/student/skills/ai/learning-strategies?page=1&limit=10").expect(200);
  await request(app).patch(`/api/student/skills/ai/learning-strategies/${recordId}`).send({ status: "saved", studentNotes: "Reviewed" }).expect(200);
  await request(app).get("/api/student/skills/ai/assessments?page=1&limit=10").expect(200);
  await request(app).post(`/api/student/skills/ai/assessments/${recordId}/submit`).send({ answers: [{ questionId: "q1", answer: "a" }] }).expect(200);
  expect(strategy.updateLearningStrategy).toHaveBeenCalledWith(userId, recordId, expect.objectContaining({ status: "saved" }));
  expect(assessment.submitAssessment).toHaveBeenCalledWith(userId, recordId, [{ questionId: "q1", answer: "a" }]);
});

test("blocks non-student roles from every student AI route", async () => {
  await request(app).get("/api/student/skills/ai/status").set("x-test-role", "admin").expect(403);
  await request(app).post("/api/student/skills/ai/coach").set("x-test-role", "admin").send({ message: "Show gaps" }).expect(403);
});
