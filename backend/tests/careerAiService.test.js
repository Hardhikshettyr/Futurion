jest.mock("../src/models/Career", () => ({ find: jest.fn() }));
jest.mock("../src/services/geminiClient", () => ({ generateStructuredContent: jest.fn() }));
jest.mock("../src/services/careerLibraryService", () => ({ findCareer: jest.fn(), presentCareer: jest.fn((career) => ({ id: String(career._id), title: career.title })) }));
jest.mock("../src/services/careerRecommendationService", () => ({ analyzeCareer: jest.fn(() => ({ score: 60 })), loadStudentCareerContext: jest.fn(), recommendCareers: jest.fn() }));

const { generateStructuredContent } = require("../src/services/geminiClient");
const { findCareer } = require("../src/services/careerLibraryService");
const { loadStudentCareerContext, recommendCareers } = require("../src/services/careerRecommendationService");
const { analyzeCareerWithAi, exploreCareersWithAi } = require("../src/services/careerAiService");
const Career = require("../src/models/Career");

const userId = "507f1f77bcf86cd799439011";
const otherUserId = "507f1f77bcf86cd799439099";
const careerId = "507f1f77bcf86cd799439012";
const career = { _id: careerId, title: "Data Analyst", shortDescription: "Analyzes evidence", industry: "Analytics", tags: ["data"], aliases: [], essentialSkills: [], desirableSkills: [], crossDisciplinePathways: [], popularityRank: 10 };

function query(value) { const result = { populate: jest.fn(), sort: jest.fn(), lean: jest.fn().mockResolvedValue(value) }; result.populate.mockReturnValue(result); result.sort.mockReturnValue(result); return result; }

beforeEach(() => {
  jest.resetAllMocks();
  Career.find.mockReturnValue(query([career]));
  loadStudentCareerContext.mockResolvedValue({ profile: { education: [] }, studentSkills: [] });
  recommendCareers.mockResolvedValue({ recommendations: [{ career: { id: careerId } }] });
  findCareer.mockResolvedValue(career);
});

test("uses only the authenticated student's context and validates grounded career IDs", async () => {
  generateStructuredContent.mockResolvedValue({ data: { answerSummary: "Consider the catalogue role.", suggestedCareers: [{ careerId, reasons: ["Matches the supplied catalogue."], matchingSkills: [], missingSkills: [], educationConsiderations: [], nextSteps: [] }], uncertainties: [], followUpQuestions: [] }, model: "gemini-test" });
  const result = await exploreCareersWithAi(userId, "What uses data?");
  expect(result.suggestedCareers[0].careerId).toBe(careerId);
  expect(loadStudentCareerContext).toHaveBeenCalledWith(userId);
  expect(loadStudentCareerContext).not.toHaveBeenCalledWith(otherUserId);
});

test("rejects an AI career that was not in retrieved records", async () => {
  generateStructuredContent.mockResolvedValue({ data: { answerSummary: "Invented", suggestedCareers: [{ careerId: otherUserId, reasons: ["Invented"], matchingSkills: [], missingSkills: [], educationConsiderations: [], nextSteps: [] }], uncertainties: [], followUpQuestions: [] }, model: "gemini-test" });
  await expect(exploreCareersWithAi(userId, "Suggest a career")).rejects.toMatchObject({ code: "AI_CAREER_GROUNDING_FAILED" });
});

test("career analysis requires the exact selected career ID", async () => {
  generateStructuredContent.mockResolvedValue({ data: { careerId, summary: "Grounded analysis", profileMatches: [], preparationAreas: [], educationConsiderations: [], crossDisciplineNotes: [], nextSteps: [], uncertainties: [] }, model: "gemini-test" });
  const result = await analyzeCareerWithAi(userId, careerId);
  expect(result.careerId).toBe(careerId);
  expect(findCareer).toHaveBeenCalledWith(careerId);
});
