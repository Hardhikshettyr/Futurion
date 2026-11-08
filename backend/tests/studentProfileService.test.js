jest.mock("../src/models/StudentProfile", () => ({
  findOne: jest.fn(),
  findOneAndUpdate: jest.fn(),
}));
jest.mock("../src/models/User", () => ({ updateOne: jest.fn() }));
jest.mock("../src/services/storageService", () => ({
  deletePrivateFile: jest.fn(),
  savePrivateFile: jest.fn(),
}));

const StudentProfile = require("../src/models/StudentProfile");
const User = require("../src/models/User");
const {
  getOrCreateStudentProfile,
  importResumeSelection,
} = require("../src/services/studentProfileService");

test("initializes a profile through an atomic unique upsert", async () => {
  const profile = { _id: "profile-1", userId: "user-1" };
  StudentProfile.findOneAndUpdate.mockReturnValue({
    select: jest.fn().mockResolvedValue(profile),
  });
  await expect(getOrCreateStudentProfile("user-1")).resolves.toBe(profile);
  expect(StudentProfile.findOneAndUpdate).toHaveBeenCalledWith(
    { userId: "user-1" },
    { $setOnInsert: { userId: "user-1" } },
    expect.objectContaining({ upsert: true, returnDocument: "after" }),
  );
});

test("recovers from a concurrent duplicate-key upsert", async () => {
  StudentProfile.findOneAndUpdate.mockReturnValue({
    select: jest.fn().mockRejectedValue({ code: 11000 }),
  });
  StudentProfile.findOne.mockReturnValue({
    select: jest.fn().mockResolvedValue({ _id: "existing" }),
  });
  await expect(getOrCreateStudentProfile("user-1")).resolves.toMatchObject({ _id: "existing" });
});

test("imports only selected AI records, preserves existing data, and never verifies skills", async () => {
  const profile = {
    personal: { headline: "Existing headline" },
    education: [{ institution: "Existing University", degree: "BSc" }],
    skills: [], projects: [], experience: [], certifications: [],
    save: jest.fn().mockResolvedValue(),
    toObject() {
      return {
        _id: { toString: () => "profile-1" }, userId: "user-1",
        personal: this.personal, education: this.education, skills: this.skills,
        projects: this.projects, experience: this.experience,
        certifications: this.certifications, preferences: {}, resume: null,
      };
    },
  };
  const user = { _id: "user-1", name: "Ada", email: "ada@example.com" };
  const data = {
    personal: { fullName: "Ada Lovelace", phone: null, city: null, country: null, headline: "AI headline", summary: null, linkedInUrl: null, githubUrl: null, portfolioUrl: null },
    education: [{ institution: "New University", degree: "MSc", academicDiscipline: "Science", specialization: null, educationLevel: null, startYear: 2025, graduationYear: 2027, currentStatus: "currently_studying", gradingType: null, gradeValue: null, gradingScale: null, location: null, relevantCoursework: [], academicAchievements: [] }],
    skills: [{ name: "Research", category: "transferable", proficiency: "advanced", description: "Evidence in projects" }],
    projects: [], experience: [], certifications: [], warnings: [],
  };
  const selection = { personal: ["fullName"], education: [0], skills: [0], projects: [], experience: [], certifications: [] };

  const result = await importResumeSelection({ profile, user, data, selection });
  expect(profile.personal.headline).toBe("Existing headline");
  expect(profile.education).toHaveLength(2);
  expect(profile.skills[0].evidenceStatus).toBe("self_declared");
  expect(User.updateOne).toHaveBeenCalledWith({ _id: "user-1" }, { $set: { name: "Ada Lovelace" } });
  expect(result.imported).toMatchObject({ personal: 1, education: 1, skills: 1 });
});
