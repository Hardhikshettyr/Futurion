jest.mock("../src/models/LearningResource", () => ({}));
jest.mock("../src/services/geminiClient", () => ({ generateStructuredContent: jest.fn(), getGeminiConfiguration: jest.fn(() => ({ available: true, model: "gemini-test" })) }));
jest.mock("../src/services/careerAiService", () => ({ compactProfile: jest.fn(() => ({ education: [], skills: [] })) }));
jest.mock("../src/services/careerRecommendationService", () => ({ loadStudentCareerContext: jest.fn() }));
jest.mock("../src/services/learningRecommendationService", () => ({ recommendLearningResources: jest.fn() }));
jest.mock("../src/services/studentLearningService", () => ({ getLearningProgress: jest.fn() }));

const { generateStructuredContent } = require("../src/services/geminiClient");
const { loadStudentCareerContext } = require("../src/services/careerRecommendationService");
const { getLearningProgress } = require("../src/services/studentLearningService");
const { assertGroundedLearningOutput } = require("../src/services/learningAiService");

const ids = { selected: "507f1f77bcf86cd799439011", supplied: "507f1f77bcf86cd799439012", invented: "507f1f77bcf86cd799439099" };
const output = (resourceId) => ({ summary: "Grounded", resourceInsights: [{ resourceId, relevance: "Relevant", prerequisiteExplanation: "None recorded", careerConnection: "Supports a supplied goal", considerations: [] }], learningSequence: [{ resourceId, position: 1, reason: "Start here" }], alternatives: [], generalGuidance: [], uncertainties: [] });

test("accepts exact supplied and selected resource identifiers", () => {
  expect(() => assertGroundedLearningOutput(output(ids.selected), [{ _id: ids.selected }], [ids.selected])).not.toThrow();
});

test("rejects invented resource identifiers and omitted selected resources", () => {
  expect(() => assertGroundedLearningOutput(output(ids.invented), [{ _id: ids.selected }], [ids.selected])).toThrow(expect.objectContaining({ code: "AI_LEARNING_GROUNDING_FAILED" }));
  expect(() => assertGroundedLearningOutput({ ...output(ids.supplied), resourceInsights: [] }, [{ _id: ids.selected }, { _id: ids.supplied }], [ids.selected])).toThrow(expect.objectContaining({ code: "AI_LEARNING_GROUNDING_FAILED" }));
});

test("AI integration dependencies remain mockable without exposing credentials", () => {
  loadStudentCareerContext.mockResolvedValue({ profile: {}, studentSkills: [] });
  getLearningProgress.mockResolvedValue({ summary: {} });
  generateStructuredContent.mockResolvedValue({ data: output(ids.selected), model: "gemini-test" });
  expect(generateStructuredContent).not.toHaveBeenCalled();
});
