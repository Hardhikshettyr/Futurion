jest.mock("../src/middleware/authenticate", () => ({ authenticate(request, _response, next) { const role = request.get("x-test-role") || "student"; request.auth = { userId: "507f1f77bcf86cd799439011", user: { _id: "507f1f77bcf86cd799439011", role } }; next(); } }));
jest.mock("../src/middleware/csrfProtection", () => ({ requireCsrf(_request, _response, next) { next(); } }));
jest.mock("../src/services/learningResourceService", () => ({ createCategory: jest.fn(), createResource: jest.fn(), getResourceDetails: jest.fn(), getResourceFilterOptions: jest.fn(), listCategories: jest.fn(), listResources: jest.fn(), updateCategory: jest.fn(), updateResource: jest.fn() }));
jest.mock("../src/services/learningRecommendationService", () => ({ recommendLearningResources: jest.fn() }));
jest.mock("../src/services/studentLearningService", () => ({ getLearningProgress: jest.fn(), listLearningLibrary: jest.fn(), removeLearningItem: jest.fn(), saveLearningResource: jest.fn(), updateLearningItem: jest.fn() }));
jest.mock("../src/services/learningAiService", () => ({ askLearningAssistant: jest.fn(), getLearningAiStatus: jest.fn() }));

const request = require("supertest");
const app = require("../src/app");
const resources = require("../src/services/learningResourceService");
const recommendations = require("../src/services/learningRecommendationService");
const learning = require("../src/services/studentLearningService");
const ai = require("../src/services/learningAiService");

const ids = { resource: "507f1f77bcf86cd799439021", category: "507f1f77bcf86cd799439022", skill: "507f1f77bcf86cd799439023", item: "507f1f77bcf86cd799439024" };
const resource = { id: ids.resource, title: "Python Tutorial", provider: "PSF", studentState: { bookmarked: false } };

beforeEach(() => {
  jest.resetAllMocks();
  jest.spyOn(console, "error").mockImplementation(() => {});
  resources.listResources.mockResolvedValue({ items: [resource], pagination: { page: 1, limit: 12, total: 1, totalPages: 1 } });
  resources.getResourceDetails.mockResolvedValue(resource);
  resources.getResourceFilterOptions.mockResolvedValue({ providers: ["PSF"], categories: [] });
  resources.listCategories.mockResolvedValue([]);
  resources.createResource.mockResolvedValue(resource);
  recommendations.recommendLearningResources.mockResolvedValue({ items: [], explanation: "No direct match" });
  learning.listLearningLibrary.mockResolvedValue({ items: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 1 } });
  learning.saveLearningResource.mockResolvedValue({ id: ids.item, resource });
  learning.updateLearningItem.mockResolvedValue({ id: ids.item, status: "completed", resource });
  learning.getLearningProgress.mockResolvedValue({ summary: { totalSaved: 1 }, bySkill: [], recentActivities: [] });
  ai.getLearningAiStatus.mockReturnValue({ available: true, model: "gemini-test" });
  ai.askLearningAssistant.mockResolvedValue({ summary: "Grounded", resourceInsights: [] });
});

afterEach(() => console.error.mockRestore());

test("searches and filters the authenticated resource catalogue", async () => {
  await request(app).get(`/api/learning/resources?q=python&resourceType=documentation&skillId=${ids.skill}&difficulty=beginner&priceType=free&page=1&limit=6`).expect(200);
  expect(resources.listResources).toHaveBeenCalledWith(expect.objectContaining({ q: "python", resourceType: "documentation", skillId: ids.skill, difficulty: "beginner", priceType: "free", limit: 6 }), { userId: "507f1f77bcf86cd799439011" });
  await request(app).get(`/api/learning/resources/${ids.resource}`).expect(200);
  expect(resources.getResourceDetails).toHaveBeenCalledWith(ids.resource, { userId: "507f1f77bcf86cd799439011" });
});

test("owns learning-library mutations through the authenticated identity", async () => {
  await request(app).post("/api/student/learning/library").send({ resourceId: ids.resource, action: "add_to_library" }).expect(201);
  expect(learning.saveLearningResource).toHaveBeenCalledWith("507f1f77bcf86cd799439011", { resourceId: ids.resource, action: "add_to_library" });
  await request(app).patch(`/api/student/learning/library/${ids.item}`).send({ status: "completed" }).expect(200);
  expect(learning.updateLearningItem).toHaveBeenCalledWith("507f1f77bcf86cd799439011", ids.item, { status: "completed" });
  await request(app).delete(`/api/student/learning/library/${ids.item}`).expect(200);
  expect(learning.removeLearningItem).toHaveBeenCalledWith("507f1f77bcf86cd799439011", ids.item);
});

test("returns deterministic recommendations, progress and validated AI responses", async () => {
  await request(app).get("/api/student/learning/recommendations").expect(200);
  expect(recommendations.recommendLearningResources).toHaveBeenCalledWith("507f1f77bcf86cd799439011");
  await request(app).get("/api/student/learning/progress").expect(200);
  await request(app).post("/api/student/learning/ai-assistant").send({ question: "Compare these resources", resourceIds: [ids.resource], weeklyHours: 5, pricePreference: "free" }).expect(200);
  expect(ai.askLearningAssistant).toHaveBeenCalledWith("507f1f77bcf86cd799439011", expect.objectContaining({ resourceIds: [ids.resource], weeklyHours: 5 }));
  await request(app).post("/api/student/learning/ai-assistant").send({ question: "", unexpected: true }).expect(400);
});

test("allows only admins to create valid resource records", async () => {
  const payload = { title: "Official Python", description: "Official documentation", resourceType: "documentation", provider: "PSF", externalUrl: "https://docs.python.org/3/tutorial/", skillsCovered: [ids.skill], prerequisites: [], difficulty: "beginner", priceType: "free", categoryId: ids.category };
  await request(app).post("/api/admin/learning/resources").send(payload).expect(403);
  await request(app).post("/api/admin/learning/resources").set("x-test-role", "admin").send(payload).expect(201);
  expect(resources.createResource).toHaveBeenCalledWith(expect.objectContaining({ title: "Official Python", externalUrl: "https://docs.python.org/3/tutorial/" }), "507f1f77bcf86cd799439011");
  await request(app).post("/api/admin/learning/resources").set("x-test-role", "admin").send({ ...payload, externalUrl: "not-a-url" }).expect(400);
});
