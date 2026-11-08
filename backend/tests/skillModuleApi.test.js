jest.mock("../src/middleware/authenticate", () => ({
  authenticate(request, _response, next) {
    request.auth = {
      userId: "507f1f77bcf86cd799439011",
      user: {
        _id: "507f1f77bcf86cd799439011",
        name: "Ada Lovelace",
        email: "ada@example.com",
        role: request.get("x-test-role") || "student",
      },
    };
    next();
  },
}));

jest.mock("../src/middleware/csrfProtection", () => ({
  requireCsrf(_request, _response, next) { next(); },
}));

jest.mock("../src/services/skillLibraryService", () => ({
  createSkill: jest.fn(),
  getSkillDependencies: jest.fn(),
  getSkillDetails: jest.fn(),
  listSkills: jest.fn(),
  manageRelationship: jest.fn(),
  setSkillStatus: jest.fn(),
  updateSkill: jest.fn(),
}));

jest.mock("../src/services/studentSkillService", () => ({
  addEvidence: jest.fn(),
  addStudentSkill: jest.fn(),
  listStudentSkills: jest.fn(),
  profileSkillProjection: jest.fn().mockResolvedValue([]),
  removeEvidence: jest.fn(),
  removeStudentSkill: jest.fn(),
  updateStudentSkill: jest.fn(),
}));

jest.mock("../src/services/skillIntelligenceService", () => ({
  analyzeCompetency: jest.fn(),
  getStudentDependencyView: jest.fn(),
  recommendSkills: jest.fn(),
}));

const request = require("supertest");
const app = require("../src/app");
const AppError = require("../src/utils/AppError");
const library = require("../src/services/skillLibraryService");
const student = require("../src/services/studentSkillService");
const intelligence = require("../src/services/skillIntelligenceService");

const skillId = "507f1f77bcf86cd799439012";
const studentSkillId = "507f1f77bcf86cd799439013";
const evidenceId = "507f1f77bcf86cd799439014";
const skill = { id: skillId, name: "Critical Thinking", category: "transferable", status: "active" };
const tracked = {
  id: studentSkillId,
  skill,
  proficiency: "beginner",
  learningStatus: "learning",
  evidenceStatus: "currently_learning",
  evidence: [],
};

beforeEach(() => {
  jest.spyOn(console, "error").mockImplementation(() => {});
  library.listSkills.mockResolvedValue({ items: [skill], pagination: { page: 1, limit: 20, total: 1, totalPages: 1 } });
  library.getSkillDetails.mockResolvedValue({ skill, prerequisites: [], relatedSkills: [], dependents: [], tree: {} });
  library.getSkillDependencies.mockResolvedValue({ skill, prerequisites: [], relatedSkills: [], dependents: [], tree: {} });
  library.createSkill.mockResolvedValue(skill);
  library.updateSkill.mockResolvedValue(skill);
  library.setSkillStatus.mockResolvedValue({ ...skill, status: "inactive" });
  library.manageRelationship.mockResolvedValue({ skill, prerequisites: [], relatedSkills: [] });
  student.listStudentSkills.mockResolvedValue({ items: [tracked], summary: { total: 1 }, pagination: { page: 1, limit: 20, total: 1, totalPages: 1 } });
  student.addStudentSkill.mockResolvedValue(tracked);
  student.updateStudentSkill.mockResolvedValue({ ...tracked, proficiency: "intermediate" });
  student.addEvidence.mockResolvedValue({ ...tracked, evidenceStatus: "demonstrated" });
  student.removeEvidence.mockResolvedValue(tracked);
  student.removeStudentSkill.mockResolvedValue();
  intelligence.getStudentDependencyView.mockResolvedValue({ skill, prerequisites: [], missingPrerequisites: [], relatedSkills: [], dependents: [], tree: {} });
  intelligence.recommendSkills.mockResolvedValue({ items: [], methodology: "Curated rules" });
  intelligence.analyzeCompetency.mockResolvedValue({ summary: { proficiencyCoverage: 50 }, requirements: [] });
});

afterEach(() => {
  console.error.mockRestore();
});

test("searches and filters the active skill library with pagination", async () => {
  const response = await request(app)
    .get("/api/skills?q=critical&category=transferable&page=1&limit=10")
    .expect(200);
  expect(response.body.items[0].name).toBe("Critical Thinking");
  expect(library.listSkills).toHaveBeenCalledWith(
    expect.objectContaining({ q: "critical", category: "transferable", page: 1, limit: 10 }),
    { includeInactive: false },
  );
});

test("returns skill dependencies and related skill details", async () => {
  await request(app).get(`/api/skills/${skillId}`).expect(200);
  await request(app).get(`/api/skills/${skillId}/dependencies`).expect(200);
  await request(app).get(`/api/skills/${skillId}/related`).expect(200);
  expect(intelligence.getStudentDependencyView).toHaveBeenCalledWith(expect.anything(), skillId);
});

test("adds, updates, and removes only the authenticated student's skills", async () => {
  await request(app).post("/api/student/skills").send({ skillId, proficiency: "beginner", learningStatus: "learning" }).expect(201);
  expect(student.addStudentSkill).toHaveBeenCalledWith("507f1f77bcf86cd799439011", expect.objectContaining({ skillId }));

  await request(app).patch(`/api/student/skills/${studentSkillId}`).send({ proficiency: "intermediate" }).expect(200);
  await request(app).delete(`/api/student/skills/${studentSkillId}`).expect(200);
  expect(student.removeStudentSkill).toHaveBeenCalledWith("507f1f77bcf86cd799439011", studentSkillId);
});

test("maps duplicate student skills to a safe conflict", async () => {
  student.addStudentSkill.mockRejectedValueOnce(new AppError(409, "STUDENT_SKILL_DUPLICATE", "You are already tracking this skill"));
  const response = await request(app).post("/api/student/skills").send({ skillId, proficiency: "beginner" }).expect(409);
  expect(response.body).toMatchObject({ success: false, code: "STUDENT_SKILL_DUPLICATE" });
});

test("adds and removes evidence while enforcing ownership in the service", async () => {
  await request(app).post(`/api/student/skills/${studentSkillId}/evidence`).send({ evidenceType: "project", referenceId: evidenceId, description: "Owned project" }).expect(201);
  await request(app).delete(`/api/student/skills/${studentSkillId}/evidence/${evidenceId}`).expect(200);

  student.addEvidence.mockRejectedValueOnce(new AppError(403, "EVIDENCE_NOT_OWNED", "The linked evidence does not belong to your profile"));
  await request(app).post(`/api/student/skills/${studentSkillId}/evidence`).send({ evidenceType: "project", referenceId: evidenceId }).expect(403);
});

test("runs competency analysis and deterministic recommendations", async () => {
  await request(app).post("/api/student/skills/competency-analysis").send({ requirements: [{ skillId, requiredProficiency: "advanced" }] }).expect(200);
  await request(app).get("/api/student/skills/recommendations").expect(200);
  expect(intelligence.analyzeCompetency).toHaveBeenCalledWith(expect.anything(), [{ skillId, requiredProficiency: "advanced" }]);
  expect(intelligence.recommendSkills).toHaveBeenCalled();
});

test("enforces student and admin authorization boundaries", async () => {
  await request(app).get("/api/student/skills").set("x-test-role", "admin").expect(403);
  await request(app).post("/api/admin/skills").send({ name: "New Skill", category: "other" }).expect(403);
  await request(app).post("/api/admin/skills").set("x-test-role", "admin").send({ name: "New Skill", category: "other" }).expect(201);
});

test("validates admin references and permits secure relationship management", async () => {
  await request(app).post(`/api/admin/skills/${skillId}/relationships`).set("x-test-role", "admin").send({ relationshipType: "prerequisite", targetSkillId: evidenceId }).expect(200);
  await request(app).delete(`/api/admin/skills/${skillId}/relationships`).set("x-test-role", "admin").send({ relationshipType: "related", targetSkillId: evidenceId }).expect(200);
  await request(app).post(`/api/admin/skills/${skillId}/relationships`).set("x-test-role", "admin").send({ relationshipType: "prerequisite", targetSkillId: "bad-id" }).expect(400);
});
