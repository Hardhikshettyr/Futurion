const { analyzeCareer, CAREER_SCORE_WEIGHTS } = require("../src/services/careerRecommendationService");

const skillIds = { analysis: "507f1f77bcf86cd799439021", research: "507f1f77bcf86cd799439022" };
const career = {
  title: "UX Researcher", careerCategory: "design_creative", industry: "Design research",
  tags: ["research", "psychology"], aliases: [], entryLevelRoles: ["Junior UX Researcher"],
  toolsAndTechnologies: ["Interview guides"], workModes: ["hybrid"], employmentTypes: ["full_time"],
  essentialSkills: [{ skillId: { _id: skillIds.research, name: "Research Methodology", slug: "research-methodology", category: "research" }, requiredProficiency: "intermediate", rationale: "Plan studies" }],
  desirableSkills: [{ skillId: { _id: skillIds.analysis, name: "Data Analysis", slug: "data-analysis", category: "analytical" }, requiredProficiency: "beginner", rationale: "Synthesize findings" }],
  acceptedDisciplines: [{ name: "Psychology", alignment: "common", notes: "" }],
  requiredCertifications: [], recommendedCertifications: [],
  crossDisciplinePathways: [{ sourceDisciplines: ["Psychology"], transferableStrengths: ["Human behaviour"], additionalSkills: [{ _id: skillIds.analysis, name: "Data Analysis", slug: "data-analysis" }], qualificationConsiderations: ["Review employer requirements"], investigationSteps: ["Interview a practitioner"] }],
};

test("uses transparent weighted factors and actual profile evidence", () => {
  const profile = {
    education: [{ academicDiscipline: "Psychology", specialization: "", degree: "BA Psychology" }],
    projects: [{ _id: "507f1f77bcf86cd799439099", title: "Interview study", description: "User research", category: "Research", technologies: ["Interview guides"] }],
    experience: [], certifications: [],
    preferences: { careerInterests: ["UX Researcher"], preferredIndustries: ["Design research"], workModes: ["hybrid"], employmentTypes: ["full_time"] },
  };
  const skills = [{ skillId: { _id: skillIds.research }, proficiency: "intermediate", evidenceStatus: "demonstrated" }];
  const result = analyzeCareer(career, profile, skills);
  expect(CAREER_SCORE_WEIGHTS).toEqual(expect.objectContaining({ skills: 35, education: 20, interests: 15 }));
  expect(result.score).toBeGreaterThan(60);
  expect(result.matchingSkills[0].skill.name).toBe("Research Methodology");
  expect(result.missingSkills[0].skill.name).toBe("Data Analysis");
  expect(result.crossDisciplinePathways[0]).toMatchObject({ transferableStrengths: ["Human behaviour"] });
  expect(result.disclaimer).toMatch(/not an eligibility/i);
});

test("does not score missing profile sections as mismatches", () => {
  const result = analyzeCareer(career, null, []);
  expect(result.score).toBeNull();
  expect(result.availableWeight).toBe(0);
  expect(result.confidence).toBe("low");
  expect(result.contributions.every((item) => item.available === false)).toBe(true);
  expect(result.scoringMethod).toMatch(/removed from the denominator/i);
});
