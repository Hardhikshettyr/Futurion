const mongoose = require("mongoose");
const { buildTaskTemplates, orderTemplates } = require("../src/services/roadmapGenerationService");

const oid = () => new mongoose.Types.ObjectId();

function context() {
  const foundationId = oid();
  const coreId = oid();
  const career = {
    _id: oid(), title: "Data Analyst", industry: "Analytics", tags: [], requiredCertifications: [], desirableSkills: [],
    essentialSkills: [{ skillId: coreId, requiredProficiency: "intermediate", rationale: "Required analysis skill" }],
  };
  const skills = [
    { _id: foundationId, name: "Statistics Foundations", difficultyLevel: "foundational", prerequisites: [], prerequisiteRules: [] },
    { _id: coreId, name: "Data Analysis", difficultyLevel: "intermediate", prerequisites: [foundationId], prerequisiteRules: [{ skillId: foundationId, importance: "essential", minimumProficiency: "beginner", requiredForLevels: [] }] },
  ];
  return { career, profile: { projects: [], certifications: [] }, studentSkills: [], skills, resources: [], foundationId, coreId };
}

test("generates missing skill gaps with prerequisites before dependent tasks", () => {
  const values = context();
  const tasks = buildTaskTemplates(values);
  const foundation = tasks.find((task) => String(task.relatedSkillIds[0]) === String(values.foundationId));
  const core = tasks.find((task) => String(task.relatedSkillIds[0]) === String(values.coreId));
  expect(foundation.stageKey).toBe("foundations");
  expect(core.dependsOnStableKeys).toContain(foundation.stableKey);
  expect(orderTemplates(tasks).indexOf(foundation)).toBeLessThan(orderTemplates(tasks).indexOf(core));
});

test("skips demonstrated skills at target and creates evidence tasks for unverified proficiency", () => {
  const demonstrated = context();
  demonstrated.studentSkills = [{ skillId: demonstrated.foundationId, proficiency: "beginner", evidenceStatus: "demonstrated" }, { skillId: demonstrated.coreId, proficiency: "intermediate", evidenceStatus: "verified" }];
  expect(buildTaskTemplates(demonstrated).filter((task) => task.taskType.startsWith("skill_"))).toHaveLength(0);

  const unverified = context();
  unverified.studentSkills = [{ skillId: unverified.foundationId, proficiency: "beginner", evidenceStatus: "demonstrated" }, { skillId: unverified.coreId, proficiency: "intermediate", evidenceStatus: "self_declared" }];
  const skillTasks = buildTaskTemplates(unverified).filter((task) => task.taskType.startsWith("skill_"));
  expect(skillTasks).toHaveLength(1);
  expect(skillTasks[0]).toMatchObject({ taskType: "skill_evidence", title: "Demonstrate Data Analysis" });
});

test("never creates duplicate tasks when a prerequisite is shared", () => {
  const values = context();
  const secondId = oid();
  values.skills.push({ _id: secondId, name: "Business Analysis", difficultyLevel: "intermediate", prerequisites: [values.foundationId], prerequisiteRules: [{ skillId: values.foundationId, importance: "essential", minimumProficiency: "beginner", requiredForLevels: [] }] });
  values.career.desirableSkills.push({ skillId: secondId, requiredProficiency: "intermediate" });
  const tasks = buildTaskTemplates(values);
  expect(new Set(tasks.map((task) => task.stableKey)).size).toBe(tasks.length);
  expect(tasks.filter((task) => String(task.relatedSkillIds[0]) === String(values.foundationId))).toHaveLength(1);
});

test("honors level-specific prerequisite rules instead of re-adding inactive rules", () => {
  const values = context();
  values.skills[1].prerequisiteRules[0].requiredForLevels = ["advanced"];
  const tasks = buildTaskTemplates(values);
  expect(tasks.some((task) => String(task.relatedSkillIds[0]) === String(values.foundationId))).toBe(false);
  expect(tasks.find((task) => String(task.relatedSkillIds[0]) === String(values.coreId)).dependsOnStableKeys).toEqual([]);
});
