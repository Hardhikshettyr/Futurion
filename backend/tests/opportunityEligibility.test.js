const { analyzeEligibility } = require("../src/services/opportunityEligibilityService");

const ids = {
  skill: "507f1f77bcf86cd799439021",
  education: "507f1f77bcf86cd799439022",
  preferred: "507f1f77bcf86cd799439023",
};

function opportunity(overrides = {}) {
  return {
    requiredSkills: [{ skillId: { _id: ids.skill, name: "Data Analysis" }, minimumProficiency: "intermediate", evidenceRequired: "demonstrated", importance: "mandatory" }],
    requiredEducation: [], requiredQualifications: [], experienceRequirements: [], eligibleGraduationYears: [], otherConditions: [],
    ...overrides,
  };
}

test("distinguishes missing evidence from an explicitly unmet requirement", () => {
  const missing = analyzeEligibility(opportunity(), null, []);
  expect(missing.requirements[0]).toMatchObject({ status: "unknown", importance: "mandatory" });
  expect(missing.overall).toBe("insufficient_information");

  const belowTarget = analyzeEligibility(opportunity(), null, [{ skillId: ids.skill, proficiency: "beginner", evidenceStatus: "self_declared" }]);
  expect(belowTarget.requirements[0].status).toBe("partially_met");
  expect(belowTarget.overall).toBe("potentially_eligible");
});

test("a mandatory mismatch controls the result while a preferred mismatch does not", () => {
  const profile = { education: [{ degree: "Secondary School", educationLevel: "secondary", institution: "School", currentStatus: "completed" }], certifications: [] };
  const education = { _id: ids.education, acceptedLevels: ["postgraduate"], acceptedDegrees: [], acceptedDisciplines: [], acceptedStatuses: [], recentGraduateWithinYears: null, importance: "mandatory", description: "Postgraduate study" };
  expect(analyzeEligibility(opportunity({ requiredSkills: [], requiredEducation: [education] }), profile, []).overall).toBe("not_eligible");

  const preferred = { ...education, _id: ids.preferred, importance: "preferred" };
  const result = analyzeEligibility(opportunity({ requiredSkills: [], requiredEducation: [preferred] }), profile, []);
  expect(result.requirements[0].status).toBe("not_met");
  expect(result.overall).toBe("insufficient_information");
});

test("meets all mandatory conditions only from recorded matching evidence", () => {
  const result = analyzeEligibility(opportunity(), null, [{ skillId: ids.skill, proficiency: "advanced", evidenceStatus: "verified" }]);
  expect(result.overall).toBe("meets_requirements");
  expect(result.summary.mandatoryCoverage).toBe(100);
  expect(result.disclaimer).toMatch(/does not verify official eligibility/i);
});
