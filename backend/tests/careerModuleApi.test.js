jest.mock("../src/middleware/authenticate", () => ({ authenticate(request, _response, next) { const role = request.get("x-test-role") || "student"; request.auth = { userId: "507f1f77bcf86cd799439011", user: { _id: "507f1f77bcf86cd799439011", role } }; next(); } }));
jest.mock("../src/middleware/csrfProtection", () => ({ requireCsrf(_request, _response, next) { next(); } }));
jest.mock("../src/services/careerLibraryService", () => ({ createCareer: jest.fn(), getCareerCategories: jest.fn(), getCareerDetails: jest.fn(), listCareers: jest.fn(), manageRelatedCareer: jest.fn(), setCareerStatus: jest.fn(), updateCareer: jest.fn() }));
jest.mock("../src/services/careerRecommendationService", () => ({ getCareerFit: jest.fn(), recommendCareers: jest.fn() }));
jest.mock("../src/services/studentCareerService", () => ({ getCareerState: jest.fn(), listCareerState: jest.fn(), recordCareerView: jest.fn(), saveCareer: jest.fn(), setComparisonSelection: jest.fn(), unsaveCareer: jest.fn() }));
jest.mock("../src/services/careerAiService", () => ({ analyzeCareerWithAi: jest.fn(), exploreCareersWithAi: jest.fn() }));

const request = require("supertest");
const app = require("../src/app");
const library = require("../src/services/careerLibraryService");
const recommendations = require("../src/services/careerRecommendationService");
const state = require("../src/services/studentCareerService");
const ai = require("../src/services/careerAiService");

const careerId = "507f1f77bcf86cd799439012";
const career = { id: careerId, title: "Public Health Data Analyst", status: "active", relatedCareers: [] };

beforeEach(() => {
  jest.resetAllMocks();
  jest.spyOn(console, "error").mockImplementation(() => {});
  library.listCareers.mockResolvedValue({ items: [career], pagination: { page: 1, limit: 12, total: 1, totalPages: 1 } });
  library.getCareerCategories.mockResolvedValue({ categories: [], industries: [] });
  library.getCareerDetails.mockResolvedValue(career);
  library.createCareer.mockResolvedValue(career);
  library.updateCareer.mockResolvedValue(career);
  library.setCareerStatus.mockResolvedValue({ ...career, status: "inactive" });
  recommendations.getCareerFit.mockResolvedValue({ score: 70 });
  recommendations.recommendCareers.mockResolvedValue({ weights: {}, recommendations: [{ career, fit: { score: 70 } }] });
  state.getCareerState.mockResolvedValue({ saved: false });
  state.listCareerState.mockResolvedValue({ items: [], pagination: { page: 1, limit: 12, total: 0, totalPages: 1 } });
  state.saveCareer.mockResolvedValue({ saved: true, selectedForComparison: false });
  state.unsaveCareer.mockResolvedValue({ saved: false, selectedForComparison: false });
  state.recordCareerView.mockResolvedValue({ recorded: true });
  ai.exploreCareersWithAi.mockResolvedValue({ answerSummary: "Grounded answer", suggestedCareers: [] });
});

afterEach(() => console.error.mockRestore());

test("searches, filters and paginates the authenticated catalogue", async () => {
  const response = await request(app).get("/api/careers?q=health&category=healthcare_life_sciences&workMode=hybrid&page=2&limit=5").expect(200);
  expect(response.body.items[0].title).toMatch(/Public Health/);
  expect(library.listCareers).toHaveBeenCalledWith(expect.objectContaining({ q: "health", category: "healthcare_life_sciences", workMode: "hybrid", page: 2, limit: 5 }));
});

test("returns career details with student-specific fit and state", async () => {
  const response = await request(app).get(`/api/careers/${careerId}`).expect(200);
  expect(response.body).toMatchObject({ career, studentFit: { score: 70 }, studentState: { saved: false } });
  expect(recommendations.getCareerFit).toHaveBeenCalledWith("507f1f77bcf86cd799439011", careerId);
});

test("scopes saved and recently viewed operations to the authenticated student", async () => {
  await request(app).post(`/api/student/careers/${careerId}/save`).send({}).expect(201);
  await request(app).post(`/api/student/careers/${careerId}/view`).expect(200);
  await request(app).get("/api/student/careers/recently-viewed").expect(200);
  expect(state.saveCareer).toHaveBeenCalledWith("507f1f77bcf86cd799439011", careerId, false);
  expect(state.recordCareerView).toHaveBeenCalledWith("507f1f77bcf86cd799439011", careerId);
  expect(state.listCareerState).toHaveBeenCalledWith("507f1f77bcf86cd799439011", expect.anything(), "recent");
});

test("validates and calls the grounded AI explorer", async () => {
  await request(app).post("/api/student/careers/ai/explore").send({ question: "Which careers use research?" }).expect(200);
  expect(ai.exploreCareersWithAi).toHaveBeenCalledWith("507f1f77bcf86cd799439011", "Which careers use research?");
  await request(app).post("/api/student/careers/ai/explore").send({ question: "", unexpected: true }).expect(400);
});

test("enforces admin authorization and validates central Skill references through the service", async () => {
  const payload = { title: "Research Coordinator", shortDescription: "Coordinates structured research delivery.", overview: "Supports research plans, documentation, participants, and delivery.", careerCategory: "education_research", industry: "Research", essentialSkills: [{ skillId: "507f1f77bcf86cd799439013", requiredProficiency: "intermediate", rationale: "Research delivery" }] };
  await request(app).post("/api/admin/careers").send(payload).expect(403);
  await request(app).post("/api/admin/careers").set("x-test-role", "admin").send(payload).expect(201);
  expect(library.createCareer).toHaveBeenCalledWith(expect.objectContaining({ title: "Research Coordinator", essentialSkills: expect.any(Array) }), "507f1f77bcf86cd799439011");
});
