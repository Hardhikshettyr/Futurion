const mongoose = require("mongoose");
const Skill = require("../src/models/Skill");
const StudentSkill = require("../src/models/StudentSkill");
const {
  assertOwnedEvidenceReference,
  deriveEvidenceStatus,
} = require("../src/services/studentSkillService");

test("normalizes canonical skill names and aliases", async () => {
  const skill = new Skill({
    name: "  Research   Methodology ",
    slug: "research-methodology",
    category: "research",
    aliases: ["Research Methods", "Research Methods", "research methodology"],
  });
  await skill.validate();
  expect(skill.name).toBe("Research Methodology");
  expect(skill.normalizedName).toBe("research methodology");
  expect(skill.aliases).toEqual(["Research Methods"]);
});

test("student skills default to self-declared and enforce one record per skill index", async () => {
  const record = new StudentSkill({
    userId: new mongoose.Types.ObjectId(),
    studentProfileId: new mongoose.Types.ObjectId(),
    skillId: new mongoose.Types.ObjectId(),
    proficiency: "beginner",
  });
  await record.validate();
  expect(record.evidenceStatus).toBe("self_declared");
  const uniqueIndex = StudentSkill.schema.indexes().find(([fields, options]) =>
    fields.userId === 1 && fields.skillId === 1 && options.unique,
  );
  expect(uniqueIndex).toBeDefined();
});

test("evidence status cannot become verified from student evidence", () => {
  expect(deriveEvidenceStatus({ evidenceStatus: "self_declared", learningStatus: "learning", evidenceReferences: [] })).toBe("currently_learning");
  expect(deriveEvidenceStatus({ evidenceStatus: "self_declared", learningStatus: "learning", evidenceReferences: [{}] })).toBe("demonstrated");
  expect(deriveEvidenceStatus({ evidenceStatus: "verified", learningStatus: "learning", evidenceReferences: [] })).toBe("verified");
});

test("validates linked evidence ownership against profile subdocuments", () => {
  const ownedProjectId = new mongoose.Types.ObjectId();
  const profile = { projects: [{ _id: ownedProjectId }], certifications: [], experience: [], education: [] };
  expect(() => assertOwnedEvidenceReference(profile, "project", ownedProjectId)).not.toThrow();
  expect(() => assertOwnedEvidenceReference(profile, "project", new mongoose.Types.ObjectId())).toThrow(expect.objectContaining({ code: "EVIDENCE_NOT_OWNED" }));
  expect(() => assertOwnedEvidenceReference(profile, "assessment", ownedProjectId)).toThrow(expect.objectContaining({ code: "EVIDENCE_REFERENCE_UNSUPPORTED" }));
});
