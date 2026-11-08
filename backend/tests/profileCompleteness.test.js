const {
  SECTION_WEIGHTS,
  calculateProfileCompleteness,
} = require("../src/services/profileCompletenessService");

const user = { name: "Ada Lovelace", email: "ada@example.com" };

function emptyProfile() {
  return {
    personal: {}, education: [], skills: [], projects: [], experience: [],
    certifications: [], preferences: {}, resume: null,
  };
}

test("profile completeness weights total exactly 100", () => {
  expect(Object.values(SECTION_WEIGHTS).reduce((sum, weight) => sum + weight, 0)).toBe(100);
});

test("calculates an incomplete new profile with actionable missing fields", () => {
  const result = calculateProfileCompleteness(emptyProfile(), user);
  expect(result.metric).toBe("profile_completeness");
  expect(result.overall).toBeGreaterThan(0);
  expect(result.overall).toBeLessThan(20);
  expect(result.missingFields).toContain("resume.resume");
  expect(result.suggestions.length).toBeGreaterThan(0);
});

test("returns 100 for a complete profile", () => {
  const profile = {
    personal: {
      phone: "1234567890", city: "Bengaluru", country: "India",
      headline: "Product engineer", summary: "Builds useful systems.",
      linkedInUrl: "https://linkedin.com/in/ada", photo: { filename: "photo.jpg" },
    },
    education: [{ institution: "Futurion University", degree: "B.Tech", academicDiscipline: "Engineering", startYear: 2022, graduationYear: 2026 }],
    skills: [
      { name: "JavaScript", evidenceStatus: "demonstrated", description: "Built products" },
      { name: "Research", evidenceStatus: "self_declared" },
      { name: "Communication", evidenceStatus: "self_declared" },
    ],
    projects: [{ title: "Career Map", description: "A planning tool", role: "Lead", outcomes: ["Reached students"] }],
    experience: [{ organization: "Lab", position: "Researcher", description: "Studied outcomes", achievements: ["Published"] }],
    certifications: [{ name: "Cloud", issuer: "Provider", credentialId: "ABC" }],
    preferences: {
      preferredRoles: ["Product engineer"], careerInterests: ["Education"],
      workModes: ["hybrid"], shortTermObjective: "Join a product team",
      longTermObjective: "Lead responsible products",
    },
    resume: { filename: "resume.pdf" },
  };
  expect(calculateProfileCompleteness(profile, user).overall).toBe(100);
});

test("ignores placeholder values and duplicate records", () => {
  const profile = emptyProfile();
  profile.skills = [
    { name: "N/A", evidenceStatus: "self_declared" },
    { name: "JavaScript", evidenceStatus: "self_declared" },
    { name: "javascript", evidenceStatus: "demonstrated" },
  ];
  const result = calculateProfileCompleteness(profile, user);
  expect(result.sections.skills.percentage).toBe(0);
});
