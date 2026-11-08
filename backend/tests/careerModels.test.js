const mongoose = require("mongoose");
const Career = require("../src/models/Career");
const StudentCareer = require("../src/models/StudentCareer");

test("normalizes career identity and deduplicates aliases and work settings", async () => {
  const career = new Career({
    title: "  Data   Storyteller ",
    shortDescription: "Turns evidence into accessible decisions.",
    overview: "A cross-disciplinary role that explains evidence responsibly.",
    careerCategory: "marketing_media",
    industry: "Media and analytics",
    aliases: ["Data Communicator", "Data Communicator", "data storyteller"],
    workModes: ["hybrid", "hybrid", "remote"],
    employmentTypes: ["full_time", "full_time"],
  });
  await career.validate();
  expect(career.title).toBe("Data Storyteller");
  expect(career.normalizedTitle).toBe("data storyteller");
  expect(career.slug).toBe("data-storyteller");
  expect(career.aliases).toEqual(["Data Communicator"]);
  expect(career.workModes).toEqual(["hybrid", "remote"]);
});

test("validates central Skill references and supported categories", async () => {
  const career = new Career({
    title: "Research Coordinator",
    shortDescription: "Coordinates evidence-focused work.",
    overview: "Supports research delivery and documentation.",
    careerCategory: "education_research",
    industry: "Research",
    essentialSkills: [{ skillId: new mongoose.Types.ObjectId(), requiredProficiency: "intermediate" }],
  });
  await expect(career.validate()).resolves.toBeUndefined();
  career.careerCategory = "technology_only";
  await expect(career.validate()).rejects.toThrow(/careerCategory/i);
});

test("prevents a Skill relationship from being both essential and desirable", async () => {
  const skillId = new mongoose.Types.ObjectId();
  const career = new Career({
    title: "Evidence Specialist",
    shortDescription: "Works with structured evidence.",
    overview: "Uses research and analysis to support decisions.",
    careerCategory: "education_research",
    industry: "Research",
    essentialSkills: [{ skillId, requiredProficiency: "intermediate" }],
    desirableSkills: [{ skillId, requiredProficiency: "beginner" }],
  });
  await expect(career.validate()).rejects.toThrow(/both essential and desirable/i);
});

test("student career state has an ownership-scoped unique index", async () => {
  const record = new StudentCareer({ userId: new mongoose.Types.ObjectId(), careerId: new mongoose.Types.ObjectId() });
  await record.validate();
  expect(record.viewCount).toBe(0);
  const index = StudentCareer.schema.indexes().find(([fields, options]) => fields.userId === 1 && fields.careerId === 1 && options.unique);
  expect(index).toBeDefined();
});
