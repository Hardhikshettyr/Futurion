const mongoose = require("mongoose");
const CareerComparison = require("../src/models/CareerComparison");
const CareerScenario = require("../src/models/CareerScenario");

const ids = [
  new mongoose.Types.ObjectId(), new mongoose.Types.ObjectId(), new mongoose.Types.ObjectId(),
  new mongoose.Types.ObjectId(), new mongoose.Types.ObjectId(),
];

test("career comparisons require two to four unique career references", async () => {
  const valid = new CareerComparison({ userId: ids[0], name: "Research paths", careerIds: [ids[1], ids[2]] });
  await expect(valid.validate()).resolves.toBeUndefined();
  const duplicate = new CareerComparison({ userId: ids[0], name: "Duplicate", careerIds: [ids[1], ids[1]] });
  await expect(duplicate.validate()).rejects.toThrow(/two to four unique careers/i);
  const tooMany = new CareerComparison({ userId: ids[0], name: "Too many", careerIds: [ids[1], ids[2], ids[3], ids[4], new mongoose.Types.ObjectId()] });
  await expect(tooMany.validate()).rejects.toThrow(/two to four unique careers/i);
});

test("career scenarios store hypothetical overrides separately and reject duplicate skills", async () => {
  const scenario = new CareerScenario({
    userId: ids[0], name: "UX transition", targetCareerId: ids[1],
    hypotheticalSkills: [{ skillId: ids[2], proficiency: "intermediate" }],
    hypotheticalQualifications: ["Research methods certificate under consideration"],
  });
  await expect(scenario.validate()).resolves.toBeUndefined();
  expect(scenario.startingPointType).toBe("existing_profile");
  expect(scenario.weeklyLearningHours).toBe(5);
  const duplicate = new CareerScenario({
    userId: ids[0], name: "Duplicate skill", targetCareerId: ids[1],
    hypotheticalSkills: [{ skillId: ids[2], proficiency: "beginner" }, { skillId: ids[2], proficiency: "advanced" }],
  });
  await expect(duplicate.validate()).rejects.toThrow(/cannot be duplicated/i);
});

test("decision models use ownership-scoped indexes", () => {
  expect(CareerComparison.schema.indexes()).toEqual(expect.arrayContaining([
    expect.arrayContaining([expect.objectContaining({ userId: 1, updatedAt: -1 })]),
  ]));
  expect(CareerScenario.schema.indexes()).toEqual(expect.arrayContaining([
    expect.arrayContaining([expect.objectContaining({ userId: 1, status: 1, updatedAt: -1 })]),
  ]));
});
