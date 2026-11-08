jest.mock("../src/services/geminiClient", () => ({ generateStructuredContent: jest.fn() }));
jest.mock("../src/services/careerDecisionAnalysisService", () => ({ analyzeCareerComparison: jest.fn(), compareCareerScenarios: jest.fn() }));
jest.mock("../src/services/careerRecommendationService", () => ({ loadStudentCareerContext: jest.fn() }));
jest.mock("../src/services/careerScenarioService", () => ({ getOwnedScenarios: jest.fn() }));
jest.mock("../src/services/careerAiService", () => ({ compactProfile: jest.fn(() => ({ education: [], skills: [] })) }));

const { generateStructuredContent } = require("../src/services/geminiClient");
const { analyzeCareerComparison, compareCareerScenarios } = require("../src/services/careerDecisionAnalysisService");
const { loadStudentCareerContext } = require("../src/services/careerRecommendationService");
const { getOwnedScenarios } = require("../src/services/careerScenarioService");
const { generateComparisonInsights, generateScenarioInsights } = require("../src/services/careerDecisionAiService");

const ids = { user: "507f1f77bcf86cd799439011", other: "507f1f77bcf86cd799439099", career1: "507f1f77bcf86cd799439021", career2: "507f1f77bcf86cd799439022", scenario1: "507f1f77bcf86cd799439031" };

beforeEach(() => {
  jest.resetAllMocks();
  loadStudentCareerContext.mockResolvedValue({ profile: {}, studentSkills: [] });
  analyzeCareerComparison.mockResolvedValue({ careers: [{ career: { id: ids.career1 } }, { career: { id: ids.career2 } }] });
  getOwnedScenarios.mockResolvedValue([{ _id: ids.scenario1, targetCareerId: ids.career1 }]);
  compareCareerScenarios.mockResolvedValue({ scenarios: [{ scenario: { id: ids.scenario1 }, targetCareer: { id: ids.career1 } }] });
});

test("comparison AI remains scoped to the authenticated student and exact selected careers", async () => {
  generateStructuredContent.mockResolvedValue({ data: {
    summary: "Grounded comparison", careerInsights: [ids.career1, ids.career2].map((careerId) => ({ careerId, strongestAlignment: "Supplied profile evidence", existingStrengths: [], majorGaps: [], educationConsiderations: [], preparationRequirements: [], advantages: [], tradeoffs: [], uncertainties: [] })), crossCareerTradeoffs: [], questionsToConsider: [], dataLimitations: [],
  }, model: "gemini-test" });
  const result = await generateComparisonInsights(ids.user, [ids.career1, ids.career2], "Explain trade-offs");
  expect(result.careerInsights).toHaveLength(2);
  expect(loadStudentCareerContext).toHaveBeenCalledWith(ids.user);
  expect(loadStudentCareerContext).not.toHaveBeenCalledWith(ids.other);
});

test("comparison AI rejects invented or omitted career IDs", async () => {
  generateStructuredContent.mockResolvedValue({ data: {
    summary: "Invalid", careerInsights: [ids.career1, ids.other].map((careerId) => ({ careerId, strongestAlignment: "Claim", existingStrengths: [], majorGaps: [], educationConsiderations: [], preparationRequirements: [], advantages: [], tradeoffs: [], uncertainties: [] })), crossCareerTradeoffs: [], questionsToConsider: [], dataLimitations: [],
  }, model: "gemini-test" });
  await expect(generateComparisonInsights(ids.user, [ids.career1, ids.career2], "Compare")).rejects.toMatchObject({ code: "AI_COMPARISON_GROUNDING_FAILED" });
});

test("scenario AI validates both scenario and target career IDs", async () => {
  generateStructuredContent.mockResolvedValue({ data: {
    summary: "Scenario explanation", scenarioInsights: [{ scenarioId: ids.scenario1, targetCareerId: ids.career1, existingStrengths: [], hypotheticalAssumptions: [], remainingGaps: [], educationConsiderations: [], preparationTradeoffs: [], practicalProjectSuggestions: [], uncertainties: [] }], crossScenarioTradeoffs: [], assumptionsToReconsider: [], questionsToConsider: [], nextSteps: [],
  }, model: "gemini-test" });
  const result = await generateScenarioInsights(ids.user, [ids.scenario1], "Review assumptions");
  expect(result.scenarioInsights[0].targetCareerId).toBe(ids.career1);
  expect(getOwnedScenarios).toHaveBeenCalledWith(ids.user, [ids.scenario1]);
});
