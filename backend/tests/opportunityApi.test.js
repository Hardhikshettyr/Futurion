jest.mock("../src/middleware/authenticate", () => ({ authenticate(request, _response, next) { const role = request.get("x-test-role") || "student"; request.auth = { userId: "507f1f77bcf86cd799439061", user: { _id: "507f1f77bcf86cd799439061", role } }; next(); } }));
jest.mock("../src/middleware/csrfProtection", () => ({ requireCsrf(_request, _response, next) { next(); } }));
jest.mock("../src/services/opportunityLibraryService", () => ({ buildOpportunityFilter: jest.fn(), createOpportunity: jest.fn(), deadlineFilter: jest.fn(), deleteOpportunity: jest.fn(), findOpportunity: jest.fn(), getOpportunityDetails: jest.fn(), getOpportunityFilters: jest.fn(), listOpportunities: jest.fn(), presentOpportunity: jest.fn(), setOpportunityStatus: jest.fn(), studentState: jest.fn(), updateOpportunity: jest.fn(), validateReferences: jest.fn() }));
jest.mock("../src/services/opportunityEligibilityService", () => ({ getOpportunityEligibility: jest.fn() }));
jest.mock("../src/services/opportunityRecommendationService", () => ({ recommendOpportunities: jest.fn() }));
jest.mock("../src/services/studentApplicationService", () => ({ listApplications: jest.fn(), removeApplication: jest.fn(), saveOpportunity: jest.fn(), updateApplication: jest.fn() }));
jest.mock("../src/services/opportunityAiService", () => ({ askOpportunityAssistant: jest.fn(), getOpportunityAiStatus: jest.fn() }));

const request = require("supertest");
const app = require("../src/app");
const library = require("../src/services/opportunityLibraryService");
const eligibility = require("../src/services/opportunityEligibilityService");
const recommendations = require("../src/services/opportunityRecommendationService");
const applications = require("../src/services/studentApplicationService");
const ai = require("../src/services/opportunityAiService");

const ids = { opportunity: "507f1f77bcf86cd799439062", application: "507f1f77bcf86cd799439063" };
const record = { id: ids.opportunity, title: "Research Internship", externalApplicationUrl: "https://example.org/apply" };

beforeEach(() => {
  jest.resetAllMocks();
  jest.spyOn(console, "error").mockImplementation(() => {});
  library.listOpportunities.mockResolvedValue({ items: [record], pagination: { page: 1, limit: 12, total: 1, totalPages: 1 } });
  library.getOpportunityDetails.mockResolvedValue(record);
  library.getOpportunityFilters.mockResolvedValue({ locations: ["Remote"], opportunityTypes: [] });
  library.createOpportunity.mockResolvedValue(record);
  library.updateOpportunity.mockResolvedValue(record);
  library.setOpportunityStatus.mockResolvedValue({ ...record, status: "inactive" });
  library.findOpportunity.mockResolvedValue(record);
  eligibility.getOpportunityEligibility.mockResolvedValue({ opportunityId: ids.opportunity, overall: "insufficient_information" });
  recommendations.recommendOpportunities.mockResolvedValue({ items: [], methodology: "deterministic" });
  applications.listApplications.mockResolvedValue({ items: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 1 } });
  applications.saveOpportunity.mockResolvedValue({ id: ids.application, opportunity: record });
  applications.updateApplication.mockResolvedValue({ id: ids.application, status: "applied", opportunity: record });
  ai.getOpportunityAiStatus.mockReturnValue({ available: true, model: "gemini-test" });
  ai.askOpportunityAssistant.mockResolvedValue({ summary: "Grounded explanation" });
});

afterEach(() => console.error.mockRestore());

test("searches the catalogue and returns deterministic student intelligence", async () => {
  await request(app).get("/api/opportunities?q=research&opportunityType=internship&deadline=upcoming_30&page=1&limit=6").expect(200);
  expect(library.listOpportunities).toHaveBeenCalledWith(expect.objectContaining({ q: "research", opportunityType: "internship", deadline: "upcoming_30", limit: 6 }), { userId: "507f1f77bcf86cd799439061" });
  await request(app).get(`/api/student/opportunities/${ids.opportunity}/eligibility`).expect(200);
  expect(eligibility.getOpportunityEligibility).toHaveBeenCalledWith("507f1f77bcf86cd799439061", ids.opportunity);
  await request(app).get("/api/student/opportunities/recommendations").expect(200);
});

test("owns tracker mutations through the authenticated student identity", async () => {
  await request(app).post("/api/student/applications").send({ opportunityId: ids.opportunity, action: "track" }).expect(201);
  expect(applications.saveOpportunity).toHaveBeenCalledWith("507f1f77bcf86cd799439061", { opportunityId: ids.opportunity, action: "track" });
  await request(app).patch(`/api/student/applications/${ids.application}`).send({ status: "applied", notes: "Submitted" }).expect(200);
  expect(applications.updateApplication).toHaveBeenCalledWith("507f1f77bcf86cd799439061", ids.application, { status: "applied", notes: "Submitted" });
  await request(app).delete(`/api/student/applications/${ids.application}`).expect(200);
  expect(applications.removeApplication).toHaveBeenCalledWith("507f1f77bcf86cd799439061", ids.application);
});

test("validates AI requests and passes only authenticated identity and opportunity context", async () => {
  await request(app).post(`/api/student/opportunities/${ids.opportunity}/ai-assistant`).send({ question: "How should I prepare?" }).expect(200);
  expect(ai.askOpportunityAssistant).toHaveBeenCalledWith("507f1f77bcf86cd799439061", ids.opportunity, { question: "How should I prepare?" });
  await request(app).post(`/api/student/opportunities/${ids.opportunity}/ai-assistant`).send({ question: "", invented: true }).expect(400);
});

test("restricts opportunity management to admins and validates official HTTPS links", async () => {
  const payload = { title: "Research Internship", organization: "Research Lab", description: "A verified structured opportunity.", opportunityType: "internship", location: "Remote", externalApplicationUrl: "https://example.org/apply" };
  await request(app).post("/api/admin/opportunities").send(payload).expect(403);
  await request(app).post("/api/admin/opportunities").set("x-test-role", "admin").send(payload).expect(201);
  expect(library.createOpportunity).toHaveBeenCalledWith(expect.objectContaining({ title: "Research Internship", externalApplicationUrl: "https://example.org/apply" }), "507f1f77bcf86cd799439061");
  await request(app).post("/api/admin/opportunities").set("x-test-role", "admin").send({ ...payload, externalApplicationUrl: "http://example.org/apply" }).expect(400);
});
