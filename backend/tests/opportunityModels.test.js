const mongoose = require("mongoose");
const Opportunity = require("../src/models/Opportunity");
const StudentApplication = require("../src/models/StudentApplication");

const skillId = new mongoose.Types.ObjectId();

function validOpportunity(overrides = {}) {
  return new Opportunity({
    title: "  Research Internship  ",
    organization: "Futurion Labs",
    description: "A structured research opportunity for students.",
    opportunityType: "internship",
    requiredSkills: [{ skillId, minimumProficiency: "beginner", evidenceRequired: "recorded", importance: "mandatory" }],
    location: "Bengaluru, India",
    workMode: "hybrid",
    externalApplicationUrl: "https://example.org/apply#form",
    ...overrides,
  });
}

test("normalizes and validates a structured opportunity", async () => {
  const opportunity = validOpportunity();
  await expect(opportunity.validate()).resolves.toBeUndefined();
  expect(opportunity.title).toBe("Research Internship");
  expect(opportunity.slug).toBe("futurion-labs-research-internship");
  expect(opportunity.externalApplicationUrl).toBe("https://example.org/apply");
});

test("rejects insecure links and duplicate skill requirements", async () => {
  await expect(validOpportunity({ externalApplicationUrl: "http://example.org/apply" }).validate()).rejects.toThrow(/https/i);
  await expect(validOpportunity({ requiredSkills: [{ skillId }, { skillId }] }).validate()).rejects.toThrow(/cannot be duplicated/i);
});

test("defines unique ownership for one application record per user and opportunity", () => {
  expect(StudentApplication.schema.indexes()).toEqual(expect.arrayContaining([
    [{ userId: 1, opportunityId: 1 }, expect.objectContaining({ unique: true })],
  ]));
  expect(Opportunity.schema.indexes().some(([fields]) => fields.status === 1 && fields.applicationDeadline === 1)).toBe(true);
});
