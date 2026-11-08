const { buildPortfolioProjection } = require("../src/services/portfolioService");

const ids = { project: "507f1f77bcf86cd799440021", skill: "507f1f77bcf86cd799440022" };
const bundle = {
  data: {
    profile: { personal: { headline: "Student developer", summary: "Builds careful products.", city: "Bengaluru", country: "India", phone: "+91-secret", linkedInUrl: "https://private.example" }, education: [{ _id: "507f1f77bcf86cd799440023", institution: "College", degree: "BTech", gradeValue: "private-grade" }], projects: [{ _id: ids.project, title: "Futurion", description: "Career platform", technologies: ["React"], secret: "hidden" }], certifications: [], experience: [], preferences: {} },
    skills: [{ skillId: { _id: ids.skill, name: "React", category: "technical" }, proficiency: "intermediate", evidenceStatus: "demonstrated", evidenceReferences: [{ _id: "507f1f77bcf86cd799440024" }], notes: "private skill notes" }],
    applications: [{ notes: "private application note" }],
  },
  achievements: [{ key: "first-project", title: "First project", description: "Documented", date: new Date(), module: "profile" }],
};

test("returns only explicitly selected sections and strips contact and internal data", () => {
  const result = buildPortfolioProjection({ user: { name: "Jane Student", email: "private@example.com" }, bundle, settings: { publicSlug: "jane", visibleSections: ["about", "skills", "achievements"], selectedAchievementKeys: ["first-project"] } });
  expect(result.sections).toHaveProperty("about");
  expect(result.sections).toHaveProperty("skills");
  expect(result.sections).not.toHaveProperty("education");
  expect(result.sections).not.toHaveProperty("projects");
  expect(JSON.stringify(result)).not.toMatch(/private@example|\+91-secret|private skill notes|private application note|private-grade/i);
  expect(result.sections.achievements).toHaveLength(1);
});

test("does not expose unselected achievements even when they exist", () => {
  const result = buildPortfolioProjection({ user: { name: "Jane Student" }, bundle, settings: { visibleSections: ["achievements"], selectedAchievementKeys: [] } });
  expect(result.sections.achievements).toEqual([]);
});
