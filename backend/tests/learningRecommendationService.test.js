const { buildLearningTargets } = require("../src/services/learningRecommendationService");

const ids = { career: "507f1f77bcf86cd799439011", programming: "507f1f77bcf86cd799439021", python: "507f1f77bcf86cd799439022" };

test("prioritizes missing prerequisites over direct career skill gaps", () => {
  const context = {
    profile: { preferences: { careerInterests: [] } },
    studentSkills: [],
    skills: [
      { _id: ids.programming, name: "Programming Fundamentals", prerequisites: [] },
      { _id: ids.python, name: "Python", prerequisites: [ids.programming] },
    ],
    savedCareers: [{ careerId: ids.career }], comparisons: [],
    careers: [{ _id: ids.career, title: "Data Analyst", industry: "Analytics", careerCategory: "data", tags: [], aliases: [], essentialSkills: [{ skillId: ids.python, requiredProficiency: "intermediate" }], desirableSkills: [] }],
  };
  const result = buildLearningTargets(context);
  expect(result.targets.get(ids.python).priority).toBe(90);
  expect(result.targets.get(ids.programming).priority).toBe(120);
  expect([...result.targets.get(ids.programming).prerequisiteFor]).toContain("Python");
});

test("does not generate unrelated targets when no goal or tracked learning exists", () => {
  const result = buildLearningTargets({ profile: null, studentSkills: [], skills: [], savedCareers: [], comparisons: [], careers: [] });
  expect(result.targets.size).toBe(0);
  expect(result.targetCareers).toHaveLength(0);
});
