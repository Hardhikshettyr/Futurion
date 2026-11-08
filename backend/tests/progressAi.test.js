const { assertGroundedProgressOutput } = require("../src/services/progressAiService");
const { progressAiOutputSchema } = require("../src/validators/progressPortfolioSchemas");

const ids = { project: "507f1f77bcf86cd799440051", career: "507f1f77bcf86cd799440052", skill: "507f1f77bcf86cd799440053" };
const bundle = { achievements: [{ key: "first-project" }], data: { profile: { projects: [{ _id: ids.project }], certifications: [], experience: [] }, skills: [{ _id: ids.skill, skillId: ids.skill }], learning: [], roadmaps: [], applications: [] } };
const output = { documentedAchievements: [{ achievementKey: "first-project", explanation: "Documented" }], nextPriorities: [{ title: "Add evidence", rationale: "Supports the record", module: "skills", referenceId: ids.skill }], projectDescriptionSuggestions: [{ projectId: ids.project, revisedDescription: "Improved description", reasoning: "More specific" }], careerProgress: [{ careerId: ids.career, explanation: "Grounded fit" }], uncertainties: [], summary: "Progress summary" };

test("accepts only supplied achievement, record, project and career references", () => {
  expect(() => assertGroundedProgressOutput(output, bundle, { _id: ids.career })).not.toThrow();
  expect(() => assertGroundedProgressOutput({ ...output, documentedAchievements: [{ achievementKey: "invented" }] }, bundle, { _id: ids.career })).toThrow(/outside the student's records/i);
  expect(() => assertGroundedProgressOutput({ ...output, projectDescriptionSuggestions: [{ projectId: "507f1f77bcf86cd799440099" }] }, bundle, { _id: ids.career })).toThrow(/outside the student's profile/i);
});

test("strict Zod validation rejects unstructured or fabricated response shapes", () => {
  expect(progressAiOutputSchema.safeParse(output).success).toBe(true);
  expect(progressAiOutputSchema.safeParse({ summary: "Only prose", inventedProjects: ["Fake"] }).success).toBe(false);
});
