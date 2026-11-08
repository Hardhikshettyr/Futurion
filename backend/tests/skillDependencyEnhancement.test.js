const skillSeedData = require("../src/data/skillSeedData");
const {
  normalizePrerequisiteRules,
} = require("../src/services/skillLibraryService");
const {
  prerequisiteProgress,
  ruleAppliesAtLevel,
} = require("../src/services/skillIntelligenceService");
const { skillSlug } = require("../src/utils/skillTaxonomy");
const { validateSeedGraph } = require("../scripts/seed-skills");

function seedSkill(name) {
  return skillSeedData.find((entry) => entry.name === name);
}

test("curated seed graph supports multiple, relevant prerequisites and validates without cycles", () => {
  expect(() => validateSeedGraph(skillSeedData)).not.toThrow();
  expect(seedSkill("Machine Learning").prerequisites.map((item) => item.slug)).toEqual([
    "python",
    "statistics",
    "linear-algebra",
  ]);
  expect(seedSkill("Database Design").prerequisites.map((item) => item.slug)).toEqual([
    "database-fundamentals",
    "sql-fundamentals",
  ]);
  expect(seedSkill("UI/UX Design").prerequisites.map((item) => item.slug)).toEqual([
    "design-fundamentals",
    "user-research",
  ]);
  expect(seedSkill("Financial Analysis").prerequisites.map((item) => item.slug)).toEqual([
    "financial-accounting",
    "spreadsheet-skills",
  ]);
});

test("skills may intentionally have no prerequisite and Programming Fundamentals is not a fallback", () => {
  expect(seedSkill("Programming Fundamentals").prerequisites).toBeUndefined();
  expect(seedSkill("Financial Accounting").prerequisites).toBeUndefined();
  expect(seedSkill("Design Fundamentals").prerequisites).toBeUndefined();
  const unrelatedUsingProgramming = skillSeedData.filter((entry) =>
    (entry.prerequisites || []).some((item) => item.slug === "programming-fundamentals") &&
    !["Data Structures and Algorithms", "Object-Oriented Programming", "Java", "Python", "JavaScript"].includes(entry.name),
  );
  expect(unrelatedUsingProgramming).toEqual([]);
  expect(new Set(skillSeedData.map((entry) => skillSlug(entry.name))).size).toBe(skillSeedData.length);
});

test("prerequisite rules reject duplicates and preserve optional level-specific metadata", () => {
  const first = "507f1f77bcf86cd799439021";
  expect(() => normalizePrerequisiteRules([first], [
    { skillId: first, importance: "essential" },
    { skillId: first, importance: "recommended" },
  ])).toThrow(expect.objectContaining({ code: "SKILL_PREREQUISITE_DUPLICATE" }));

  const rules = normalizePrerequisiteRules([first], [{
    skillId: first,
    importance: "recommended",
    minimumProficiency: "intermediate",
    requiredForLevels: ["advanced", "expert"],
  }]);
  expect(rules[0]).toMatchObject({ importance: "recommended", minimumProficiency: "intermediate" });
  expect(ruleAppliesAtLevel(rules[0], "beginner")).toBe(false);
  expect(ruleAppliesAtLevel(rules[0], "advanced")).toBe(true);
});

test("prerequisite completion distinguishes completed, in-progress, and missing records", () => {
  const rule = { minimumProficiency: "intermediate" };
  expect(prerequisiteProgress(null, rule)).toBe("missing");
  expect(prerequisiteProgress({ proficiency: "beginner", learningStatus: "learning", evidenceStatus: "self_declared" }, rule)).toBe("in_progress");
  expect(prerequisiteProgress({ proficiency: "intermediate", learningStatus: "practicing", evidenceStatus: "self_declared" }, rule)).toBe("completed");
});
