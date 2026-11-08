const { relevanceForOpportunity } = require("../src/services/opportunityRecommendationService");

const ids = { career: "507f1f77bcf86cd799439031", skill: "507f1f77bcf86cd799439032" };
const baseOpportunity = {
  title: "Data Science Internship", organization: "Research Lab", location: "Remote", opportunityType: "internship",
  careerIds: [{ _id: ids.career, title: "Data Scientist", industry: "Technology" }],
  requiredSkills: [{ skillId: { _id: ids.skill, name: "Python" }, minimumProficiency: "beginner", evidenceRequired: "recorded", importance: "mandatory" }],
  requiredEducation: [], requiredQualifications: [], experienceRequirements: [], eligibleGraduationYears: [], otherConditions: [],
};

test("ranks with transparent saved-career, interest, skill and eligibility signals", () => {
  const aligned = relevanceForOpportunity(baseOpportunity, {
    profile: { preferences: { careerInterests: ["Data Scientist"], preferredIndustries: ["Technology"] } },
    studentSkills: [{ skillId: ids.skill, proficiency: "intermediate", evidenceStatus: "demonstrated" }],
  }, new Set([ids.career]));
  const sparse = relevanceForOpportunity(baseOpportunity, { profile: null, studentSkills: [] }, new Set());
  expect(aligned.score).toBeGreaterThan(sparse.score);
  expect(aligned.reasons.join(" ")).toMatch(/saved/i);
  expect(aligned.eligibility.overall).toBe("meets_requirements");
  expect(sparse.missingRequirements[0]).toMatchObject({ status: "unknown", title: "Python" });
});
