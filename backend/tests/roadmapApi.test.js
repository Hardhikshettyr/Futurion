jest.mock("../src/middleware/authenticate", () => ({ authenticate(request, _response, next) { const role = request.get("x-test-role") || "student"; request.auth = { userId: "507f1f77bcf86cd799439011", user: { _id: "507f1f77bcf86cd799439011", role } }; next(); } }));
jest.mock("../src/middleware/csrfProtection", () => ({ requireCsrf(_request, _response, next) { next(); } }));
jest.mock("../src/services/roadmapService", () => ({ calculateRoadmapProgress: jest.fn(), confirmRoadmapRefresh: jest.fn(), createRoadmap: jest.fn(), deleteRoadmap: jest.fn(), getRoadmap: jest.fn(), listRoadmaps: jest.fn(), ownedRoadmap: jest.fn(), presentRoadmap: jest.fn(), proposeRoadmapRefresh: jest.fn(), taskList: jest.fn(), updateRoadmap: jest.fn(), updateRoadmapTask: jest.fn() }));
jest.mock("../src/services/roadmapAiService", () => ({ askRoadmapAssistant: jest.fn(), getRoadmapAiStatus: jest.fn() }));

const request = require("supertest");
const app = require("../src/app");
const roadmaps = require("../src/services/roadmapService");
const ai = require("../src/services/roadmapAiService");

const ids = { user: "507f1f77bcf86cd799439011", career: "507f1f77bcf86cd799439012", roadmap: "507f1f77bcf86cd799439013", task: "507f1f77bcf86cd799439014" };
const roadmap = { id: ids.roadmap, name: "Data roadmap", stages: [], progress: { completionPercentage: 0 } };

beforeEach(() => {
  jest.resetAllMocks();
  jest.spyOn(console, "error").mockImplementation(() => {});
  roadmaps.listRoadmaps.mockResolvedValue({ items: [roadmap], pagination: { page: 1, limit: 12, total: 1, pages: 1 } });
  roadmaps.createRoadmap.mockResolvedValue(roadmap);
  roadmaps.getRoadmap.mockResolvedValue(roadmap);
  roadmaps.updateRoadmap.mockResolvedValue(roadmap);
  roadmaps.updateRoadmapTask.mockResolvedValue(roadmap);
  roadmaps.ownedRoadmap.mockResolvedValue(roadmap);
  roadmaps.proposeRoadmapRefresh.mockResolvedValue({ additions: [], removals: [], changes: [] });
  roadmaps.confirmRoadmapRefresh.mockResolvedValue(roadmap);
  ai.getRoadmapAiStatus.mockReturnValue({ available: true, model: "gemini-test" });
  ai.askRoadmapAssistant.mockResolvedValue({ summary: "Grounded explanation", taskInsights: [] });
});

afterEach(() => console.error.mockRestore());

test("exposes roadmap CRUD and task status endpoints under authenticated ownership", async () => {
  await request(app).get("/api/student/roadmaps").expect(200);
  await request(app).post("/api/student/roadmaps").send({ targetCareerId: ids.career, weeklyLearningHours: 5, targetDate: null }).expect(201);
  expect(roadmaps.createRoadmap).toHaveBeenCalledWith(ids.user, expect.objectContaining({ targetCareerId: ids.career, weeklyLearningHours: 5 }));
  await request(app).get(`/api/student/roadmaps/${ids.roadmap}`).expect(200);
  await request(app).patch(`/api/student/roadmaps/${ids.roadmap}`).send({ status: "paused" }).expect(200);
  await request(app).patch(`/api/student/roadmaps/${ids.roadmap}/tasks/${ids.task}`).send({ status: "in_progress" }).expect(200);
  expect(roadmaps.updateRoadmapTask).toHaveBeenCalledWith(ids.user, ids.roadmap, ids.task, "in_progress");
  await request(app).delete(`/api/student/roadmaps/${ids.roadmap}`).expect(200);
  await request(app).post("/api/student/roadmaps").send({ targetCareerId: ids.career, weeklyLearningHours: 5, targetDate: "2026-99-99" }).expect(400);
});

test("requires review and confirmation through separate refresh endpoints", async () => {
  await request(app).post(`/api/student/roadmaps/${ids.roadmap}/refresh`).send({}).expect(200);
  expect(roadmaps.proposeRoadmapRefresh).toHaveBeenCalledWith(ids.user, ids.roadmap);
  await request(app).post(`/api/student/roadmaps/${ids.roadmap}/refresh/confirm`).send({}).expect(200);
  expect(roadmaps.confirmRoadmapRefresh).toHaveBeenCalledWith(ids.user, ids.roadmap);
});

test("validates AI requests and denies admins access to student roadmaps", async () => {
  await request(app).post(`/api/student/roadmaps/${ids.roadmap}/ai-assistant`).send({ question: "Explain the sequence", taskId: ids.task }).expect(200);
  expect(ai.askRoadmapAssistant).toHaveBeenCalledWith(ids.user, ids.roadmap, { question: "Explain the sequence", taskId: ids.task });
  await request(app).post(`/api/student/roadmaps/${ids.roadmap}/ai-assistant`).send({ question: "", unexpected: true }).expect(400);
  await request(app).get(`/api/student/roadmaps/${ids.roadmap}/ai-status`).expect(200);
  expect(roadmaps.ownedRoadmap).toHaveBeenCalledWith(ids.user, ids.roadmap);
  await request(app).get("/api/student/roadmaps").set("x-test-role", "admin").expect(403);
});
