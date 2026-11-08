jest.mock("../src/middleware/authenticate", () => ({ authenticate(request, _response, next) { const role = request.get("x-test-role") || "student"; request.auth = { userId: "507f1f77bcf86cd799440061", user: { _id: "507f1f77bcf86cd799440061", role } }; next(); } }));
jest.mock("../src/middleware/csrfProtection", () => ({ requireCsrf(_request, _response, next) { next(); } }));
jest.mock("../src/services/progressService", () => ({ getProgressBundle: jest.fn(), getProgressOverview: jest.fn() }));
jest.mock("../src/services/progressAiService", () => ({ askProgressAssistant: jest.fn(), getProgressAiStatus: jest.fn() }));
jest.mock("../src/services/portfolioService", () => ({ getPublicPortfolio: jest.fn(), getStudentPortfolio: jest.fn(), publishPortfolio: jest.fn(), updatePortfolioContent: jest.fn(), updatePublicSettings: jest.fn() }));
jest.mock("../src/services/portfolioPdfService", () => ({ generatePortfolioPdf: jest.fn() }));

const request = require("supertest");
const app = require("../src/app");
const progress = require("../src/services/progressService");
const ai = require("../src/services/progressAiService");
const portfolios = require("../src/services/portfolioService");
const pdf = require("../src/services/portfolioPdfService");

const ids = { career: "507f1f77bcf86cd799440062" };
const portfolioResult = { settings: { isPublic: false, publicSlug: null, visibleSections: [], selectedAchievementKeys: [] }, availableSections: ["about"], availableAchievements: [], portfolio: { name: "Jane", sections: {} } };

beforeEach(() => {
  jest.resetAllMocks(); jest.spyOn(console, "error").mockImplementation(() => {});
  progress.getProgressOverview.mockResolvedValue({ metrics: { skillsDeveloped: 2 }, recentAchievements: [], recentActivity: [], insights: {} });
  progress.getProgressBundle.mockResolvedValue({ timeline: [{ id: "skill:1", title: "Skill added" }], achievements: [{ key: "first-project" }] });
  ai.getProgressAiStatus.mockReturnValue({ available: true, model: "gemini-test" });
  ai.askProgressAssistant.mockResolvedValue({ summary: "Grounded progress" });
  portfolios.getStudentPortfolio.mockResolvedValue(portfolioResult);
  portfolios.updatePortfolioContent.mockResolvedValue(portfolioResult);
  portfolios.publishPortfolio.mockResolvedValue({ ...portfolioResult, settings: { ...portfolioResult.settings, isPublic: true, publicSlug: "jane" } });
  portfolios.updatePublicSettings.mockResolvedValue(portfolioResult);
  portfolios.getPublicPortfolio.mockResolvedValue({ name: "Jane", sections: { about: { summary: "Public" } } });
  pdf.generatePortfolioPdf.mockResolvedValue(Buffer.from("%PDF-test"));
});
afterEach(() => console.error.mockRestore());

test("returns owned progress aggregation, timeline and achievements", async () => {
  await request(app).get("/api/student/progress/overview").expect(200);
  expect(progress.getProgressOverview).toHaveBeenCalledWith("507f1f77bcf86cd799440061");
  const timeline = await request(app).get("/api/student/progress/timeline?limit=20").expect(200);
  expect(timeline.body.items).toHaveLength(1);
  await request(app).get("/api/student/progress/achievements").expect(200);
});

test("validates the read-only AI assistant and derives identity from authentication", async () => {
  await request(app).post("/api/student/progress/ai-assistant").send({ question: "What should I do next?", selectedCareerId: ids.career }).expect(200);
  expect(ai.askProgressAssistant).toHaveBeenCalledWith("507f1f77bcf86cd799440061", { question: "What should I do next?", selectedCareerId: ids.career });
  await request(app).post("/api/student/progress/ai-assistant").send({ question: "", userId: "507f1f77bcf86cd799440099" }).expect(400);
});

test("updates only the authenticated student's portfolio settings", async () => {
  const body = { visibleSections: ["about"], selectedAchievementKeys: [] };
  await request(app).patch("/api/student/portfolio").send(body).expect(200);
  expect(portfolios.updatePortfolioContent).toHaveBeenCalledWith("507f1f77bcf86cd799440061", body);
  await request(app).post("/api/student/portfolio/public").send({ publicSlug: "jane-career" }).expect(200);
  expect(portfolios.publishPortfolio).toHaveBeenCalledWith("507f1f77bcf86cd799440061", { publicSlug: "jane-career" });
  await request(app).patch("/api/student/portfolio/public-settings").send({ isPublic: false }).expect(200);
  expect(portfolios.updatePublicSettings).toHaveBeenCalledWith("507f1f77bcf86cd799440061", { isPublic: false });
});

test("serves public projections without authentication and a private PDF to its owner", async () => {
  const publicResponse = await request(app).get("/api/public/portfolio/jane-career").expect(200);
  expect(publicResponse.body.portfolio.sections.about.summary).toBe("Public");
  const pdfResponse = await request(app).get("/api/student/portfolio/pdf").expect(200).expect("Content-Type", /application\/pdf/);
  expect(pdfResponse.body.subarray(0, 4).toString()).toBe("%PDF");
});

test("rejects admin access to student-owned progress and portfolio routes", async () => {
  await request(app).get("/api/student/progress/overview").set("x-test-role", "admin").expect(403);
  await request(app).get("/api/student/portfolio").set("x-test-role", "admin").expect(403);
});
