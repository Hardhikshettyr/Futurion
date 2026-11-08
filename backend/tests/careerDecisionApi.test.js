jest.mock("../src/middleware/authenticate", () => ({ authenticate(request, _response, next) { const role = request.get("x-test-role") || "student"; request.auth = { userId: "507f1f77bcf86cd799439011", user: { _id: "507f1f77bcf86cd799439011", role } }; next(); } }));
jest.mock("../src/middleware/csrfProtection", () => ({ requireCsrf(_request, _response, next) { next(); } }));
jest.mock("../src/services/careerComparisonService", () => ({ createComparison: jest.fn(), deleteComparison: jest.fn(), getComparison: jest.fn(), listComparisons: jest.fn(), updateComparison: jest.fn() }));
jest.mock("../src/services/careerDecisionAnalysisService", () => ({ analyzeCareerComparison: jest.fn() }));
jest.mock("../src/services/careerScenarioService", () => ({ analyzeSavedScenario: jest.fn(), analyzeScenarioPreview: jest.fn(), compareSavedScenarios: jest.fn(), createScenario: jest.fn(), deleteScenario: jest.fn(), duplicateScenario: jest.fn(), getScenario: jest.fn(), listScenarios: jest.fn(), updateScenario: jest.fn() }));
jest.mock("../src/services/careerDecisionAiService", () => ({ generateComparisonInsights: jest.fn(), generateScenarioInsights: jest.fn() }));

const request = require("supertest");
const app = require("../src/app");
const comparisons = require("../src/services/careerComparisonService");
const analysis = require("../src/services/careerDecisionAnalysisService");
const scenarios = require("../src/services/careerScenarioService");
const ai = require("../src/services/careerDecisionAiService");

const ids = { career1: "507f1f77bcf86cd799439021", career2: "507f1f77bcf86cd799439022", comparison: "507f1f77bcf86cd799439031", scenario1: "507f1f77bcf86cd799439041", scenario2: "507f1f77bcf86cd799439042", skill: "507f1f77bcf86cd799439051" };
const comparison = { id: ids.comparison, name: "Paths", careerIds: [ids.career1, ids.career2] };
const scenario = { id: ids.scenario1, name: "Research", targetCareer: { id: ids.career1 } };

beforeEach(() => {
  jest.resetAllMocks();
  jest.spyOn(console, "error").mockImplementation(() => {});
  comparisons.createComparison.mockResolvedValue(comparison);
  comparisons.listComparisons.mockResolvedValue({ items: [comparison], pagination: { page: 1, limit: 12, total: 1, totalPages: 1 } });
  comparisons.getComparison.mockResolvedValue({ ...comparison, analysis: {} });
  comparisons.updateComparison.mockResolvedValue(comparison);
  analysis.analyzeCareerComparison.mockResolvedValue({ careers: [] });
  scenarios.createScenario.mockResolvedValue(scenario);
  scenarios.listScenarios.mockResolvedValue({ items: [scenario], pagination: { page: 1, limit: 12, total: 1, totalPages: 1 } });
  scenarios.getScenario.mockResolvedValue(scenario);
  scenarios.updateScenario.mockResolvedValue(scenario);
  scenarios.duplicateScenario.mockResolvedValue({ ...scenario, id: ids.scenario2 });
  scenarios.analyzeScenarioPreview.mockResolvedValue({ scenario: {}, differences: { actualProfileWasModified: false } });
  scenarios.analyzeSavedScenario.mockResolvedValue({ scenario: {} });
  scenarios.compareSavedScenarios.mockResolvedValue({ scenarios: [] });
  ai.generateComparisonInsights.mockResolvedValue({ summary: "Grounded", careerInsights: [] });
  ai.generateScenarioInsights.mockResolvedValue({ summary: "Grounded", scenarioInsights: [] });
});

afterEach(() => console.error.mockRestore());

test("creates, analyzes and retrieves only the authenticated student's comparison", async () => {
  await request(app).post("/api/student/career-comparisons").send({ name: "Paths", careerIds: [ids.career1, ids.career2] }).expect(201);
  expect(comparisons.createComparison).toHaveBeenCalledWith("507f1f77bcf86cd799439011", expect.objectContaining({ careerIds: [ids.career1, ids.career2] }));
  await request(app).post("/api/student/career-comparisons/analyze").send({ careerIds: [ids.career1, ids.career2] }).expect(200);
  await request(app).get(`/api/student/career-comparisons/${ids.comparison}`).expect(200);
  expect(comparisons.getComparison).toHaveBeenCalledWith("507f1f77bcf86cd799439011", ids.comparison, { withAnalysis: true });
});

test("prevents duplicate career selections before the service is called", async () => {
  const response = await request(app).post("/api/student/career-comparisons").send({ name: "Duplicate", careerIds: [ids.career1, ids.career1] }).expect(400);
  expect(response.body.code).toBe("VALIDATION_ERROR");
  expect(comparisons.createComparison).not.toHaveBeenCalled();
});

test("creates and previews a scenario without accepting profile mutation fields", async () => {
  const payload = { name: "Research", targetCareerId: ids.career1, hypotheticalSkills: [{ skillId: ids.skill, proficiency: "intermediate" }] };
  await request(app).post("/api/student/career-scenarios").send(payload).expect(201);
  expect(scenarios.createScenario).toHaveBeenCalledWith("507f1f77bcf86cd799439011", expect.objectContaining({ targetCareerId: ids.career1 }));
  await request(app).post("/api/student/career-scenarios/analyze").send(payload).expect(200);
  await request(app).post("/api/student/career-scenarios/analyze").send({ ...payload, userId: "507f1f77bcf86cd799439099" }).expect(400);
  expect(scenarios.analyzeScenarioPreview).toHaveBeenCalledTimes(1);
});

test("compares, duplicates and archives owned scenarios", async () => {
  await request(app).post("/api/student/career-scenarios/compare").send({ scenarioIds: [ids.scenario1, ids.scenario2] }).expect(200);
  expect(scenarios.compareSavedScenarios).toHaveBeenCalledWith("507f1f77bcf86cd799439011", [ids.scenario1, ids.scenario2]);
  await request(app).post(`/api/student/career-scenarios/${ids.scenario1}/duplicate`).send({}).expect(201);
  await request(app).patch(`/api/student/career-scenarios/${ids.scenario1}`).send({ status: "archived" }).expect(200);
});

test("enforces the student role on decision routes and validates AI requests", async () => {
  await request(app).get("/api/student/career-comparisons").set("x-test-role", "admin").expect(403);
  await request(app).post("/api/student/career-comparisons/ai-insights").send({ careerIds: [ids.career1, ids.career2], question: "Explain trade-offs" }).expect(200);
  expect(ai.generateComparisonInsights).toHaveBeenCalledWith("507f1f77bcf86cd799439011", [ids.career1, ids.career2], "Explain trade-offs");
  await request(app).post("/api/student/career-scenarios/ai-insights").send({ scenarioIds: [ids.scenario1], question: "" }).expect(400);
});
