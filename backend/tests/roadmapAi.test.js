jest.mock("../src/services/geminiClient", () => ({ generateStructuredContent: jest.fn(), getGeminiConfiguration: jest.fn(() => ({ available: true, model: "gemini-test" })) }));
jest.mock("../src/services/careerAiService", () => ({ compactProfile: jest.fn(() => ({})) }));
jest.mock("../src/services/careerRecommendationService", () => ({ loadStudentCareerContext: jest.fn() }));
jest.mock("../src/services/roadmapService", () => ({ getRoadmap: jest.fn() }));

const { assertGroundedRoadmapOutput } = require("../src/services/roadmapAiService");

const ids = { task: "507f1f77bcf86cd799439011", resource: "507f1f77bcf86cd799439012", invented: "507f1f77bcf86cd799439099" };
const roadmap = { stages: [{ tasks: [{ id: ids.task, retired: false, linkedResources: [{ id: ids.resource }] }] }] };
const output = (taskId = ids.task, resourceId = ids.resource) => ({ taskInsights: [{ taskId, resourceConnections: [{ resourceId, explanation: "Supports the task" }] }] });

test("accepts exact task and resource references from the supplied roadmap", () => {
  expect(() => assertGroundedRoadmapOutput(output(), roadmap, ids.task)).not.toThrow();
});

test("rejects fabricated task or resource identifiers and omitted selected tasks", () => {
  expect(() => assertGroundedRoadmapOutput(output(ids.invented), roadmap)).toThrow(expect.objectContaining({ code: "AI_ROADMAP_GROUNDING_FAILED" }));
  expect(() => assertGroundedRoadmapOutput(output(ids.task, ids.invented), roadmap)).toThrow(expect.objectContaining({ code: "AI_ROADMAP_GROUNDING_FAILED" }));
  expect(() => assertGroundedRoadmapOutput({ taskInsights: [] }, roadmap, ids.task)).toThrow(expect.objectContaining({ code: "AI_ROADMAP_GROUNDING_FAILED" }));
});
