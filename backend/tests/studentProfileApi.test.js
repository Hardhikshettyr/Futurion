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

jest.mock("../src/services/studentProfileService", () => ({
  getOrCreateStudentProfile: jest.fn(),
  importResumeSelection: jest.fn(),
  presentStudentProfile: jest.fn(),
  removeProfileFile: jest.fn(),
  replaceProfileFile: jest.fn(),
  replaceSection: jest.fn(),
  updatePersonal: jest.fn(),
  updatePreferences: jest.fn(),
}));

jest.mock("../src/services/storageService", () => ({
  readPrivateFile: jest.fn(),
}));

jest.mock("../src/services/studentSkillService", () => ({
  profileSkillProjection: jest.fn().mockResolvedValue([]),
}));

jest.mock("../src/services/legacySkillMigrationService", () => ({
  migrateProfileSkills: jest.fn().mockResolvedValue({}),
  skillIdentityMap: jest.fn().mockResolvedValue(new Map()),
}));

jest.mock("../src/services/resumeParsingService", () => {
  class ResumeParsingError extends Error {
    constructor(code, message, status) {
      super(message);
      this.code = code;
      this.status = status;
    }
  }
  return { ResumeParsingError, parseResumeWithGemini: jest.fn() };
});

const request = require("supertest");
const app = require("../src/app");
const profileService = require("../src/services/studentProfileService");
const { readPrivateFile } = require("../src/services/storageService");
const { parseResumeWithGemini } = require("../src/services/resumeParsingService");

const safeProfile = {
  id: "profile-1",
  personal: { name: "Ada Lovelace", email: "ada@example.com", photo: null },
  education: [], skills: [], projects: [], experience: [], certifications: [],
  preferences: {}, resume: null, completeness: { overall: 10 },
};

const storedProfile = {
  personal: { photo: null },
  resume: null,
  save: jest.fn().mockResolvedValue(),
};

beforeEach(() => {
  storedProfile.personal.photo = null;
  storedProfile.resume = null;
  storedProfile.save.mockClear();
  profileService.getOrCreateStudentProfile.mockResolvedValue(storedProfile);
  profileService.presentStudentProfile.mockReturnValue(safeProfile);
  profileService.updatePersonal.mockResolvedValue(safeProfile);
  profileService.replaceSection.mockResolvedValue(safeProfile);
  profileService.updatePreferences.mockResolvedValue(safeProfile);
  profileService.replaceProfileFile.mockResolvedValue(safeProfile);
  profileService.removeProfileFile.mockResolvedValue(safeProfile);
  profileService.importResumeSelection.mockResolvedValue({ profile: safeProfile, imported: {} });
  readPrivateFile.mockResolvedValue(Buffer.from("private-file"));
  parseResumeWithGemini.mockResolvedValue({
    personal: { fullName: "Ada", phone: null, city: null, country: null, headline: null, summary: null, linkedInUrl: null, githubUrl: null, portfolioUrl: null },
    education: [], skills: [], projects: [], experience: [], certifications: [], warnings: [],
  });
});

test("initializes and returns only the authenticated student's profile", async () => {
  const response = await request(app).get("/api/student/profile").expect(200);
  expect(profileService.getOrCreateStudentProfile).toHaveBeenCalledWith("507f1f77bcf86cd799439011");
  expect(response.body.profile.personal.email).toBe("ada@example.com");
  expect(response.body.profile.userId).toBeUndefined();
});

test("blocks admins and rejects frontend-supplied identity or email fields", async () => {
  await request(app).get("/api/student/profile").set("x-test-role", "admin").expect(403);
  await request(app).patch("/api/student/profile/personal").send({ email: "attacker@example.com", userId: "other" }).expect(400);
  expect(profileService.updatePersonal).not.toHaveBeenCalled();
});

test("updates personal information and full-array profile sections", async () => {
  await request(app).patch("/api/student/profile/personal").send({ name: "Ada L", city: "Bengaluru" }).expect(200);
  expect(profileService.updatePersonal).toHaveBeenCalledWith(expect.objectContaining({ values: { name: "Ada L", city: "Bengaluru" } }));

  await request(app).put("/api/student/profile/education").send({ education: [{ institution: "University" }] }).expect(200);
  expect(profileService.replaceSection).toHaveBeenCalledWith(expect.objectContaining({ section: "education" }));
});

test("accepts valid photo and resume signatures while rejecting spoofed files", async () => {
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1]);
  await request(app).post("/api/student/profile/photo").attach("photo", png, { filename: "photo.png", contentType: "image/png" }).expect(200);
  await request(app).post("/api/student/profile/photo").attach("photo", Buffer.from("fake"), { filename: "photo.png", contentType: "image/png" }).expect(400);

  await request(app).post("/api/student/profile/resume").attach("resume", Buffer.from("%PDF-1.7"), { filename: "resume.pdf", contentType: "application/pdf" }).expect(200);
  await request(app).post("/api/student/profile/resume").attach("resume", Buffer.from("fake"), { filename: "resume.pdf", contentType: "application/pdf" }).expect(400);
});

test("rejects oversized uploads before controller storage", async () => {
  const oversized = Buffer.alloc(3 * 1024 * 1024 + 1, 1);
  oversized.set(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  await request(app).post("/api/student/profile/photo").attach("photo", oversized, { filename: "photo.png", contentType: "image/png" }).expect(413);
});

test("serves a resume privately, supports replacement/deletion, and enforces ownership through auth", async () => {
  storedProfile.resume = { storageKey: "owned/resume.pdf", filename: "futurion-resume.pdf", mimeType: "application/pdf" };
  const response = await request(app).get("/api/student/profile/resume").expect(200);
  expect(response.headers["content-disposition"]).toMatch(/attachment/);
  expect(readPrivateFile).toHaveBeenCalledWith("owned/resume.pdf");
  await request(app).delete("/api/student/profile/resume").expect(200);
  expect(profileService.removeProfileFile).toHaveBeenCalledWith(expect.objectContaining({ kind: "resume" }));
});

test("returns AI extraction for review without importing it automatically", async () => {
  storedProfile.resume = { storageKey: "owned/resume.pdf", filename: "resume.pdf", mimeType: "application/pdf", lastParsedAt: null };
  const response = await request(app).post("/api/student/profile/resume/parse").expect(200);
  expect(response.body.notice).toMatch(/review/i);
  expect(profileService.importResumeSelection).not.toHaveBeenCalled();
  expect(storedProfile.save).toHaveBeenCalled();
});

test("imports only after an explicit confirmation request", async () => {
  const data = {
    personal: { fullName: "Ada", phone: null, city: null, country: null, headline: null, summary: null, linkedInUrl: null, githubUrl: null, portfolioUrl: null },
    education: [], skills: [], projects: [], experience: [], certifications: [], warnings: [],
  };
  const selection = { personal: ["fullName"], education: [], skills: [], projects: [], experience: [], certifications: [] };
  await request(app).post("/api/student/profile/resume/import").send({ data, selection }).expect(200);
  expect(profileService.importResumeSelection).toHaveBeenCalledWith(expect.objectContaining({ data, selection }));
});
