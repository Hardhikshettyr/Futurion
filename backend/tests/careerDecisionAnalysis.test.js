jest.mock("../src/models/Career");
jest.mock("../src/models/Skill");
jest.mock("../src/models/StudentProfile");
jest.mock("../src/models/StudentSkill");

const Career = require("../src/models/Career");
const Skill = require("../src/models/Skill");
const StudentProfile = require("../src/models/StudentProfile");
const StudentSkill = require("../src/models/StudentSkill");
const {
  analyzeCareerComparison,
  analyzeCareerScenario,
  compareCareerScenarios,
} = require("../src/services/careerDecisionAnalysisService");

const ids = {
  user: "507f1f77bcf86cd799439011",
  research: "507f1f77bcf86cd799439021",
  foundation: "507f1f77bcf86cd799439022",
  analysis: "507f1f77bcf86cd799439023",
  ux: "507f1f77bcf86cd799439031",
  analyst: "507f1f77bcf86cd799439032",
  scenario1: "507f1f77bcf86cd799439041",
  scenario2: "507f1f77bcf86cd799439042",
};

const skills = [
  { _id: ids.foundation, name: "Research Fundamentals", slug: "research-fundamentals", category: "research", difficultyLevel: "foundational", prerequisites: [], prerequisiteRules: [], status: "active" },
  { _id: ids.research, name: "User Research", slug: "user-research", category: "research", difficultyLevel: "intermediate", prerequisites: [ids.foundation], prerequisiteRules: [{ skillId: ids.foundation, importance: "essential", minimumProficiency: "beginner", requiredForLevels: [] }], status: "active" },
  { _id: ids.analysis, name: "Data Analysis", slug: "data-analysis", category: "analytical", difficultyLevel: "intermediate", prerequisites: [], prerequisiteRules: [], status: "active" },
];

function career(_id, title, skillId, category) {
  return {
    _id, title, slug: title.toLowerCase().replaceAll(" ", "-"), shortDescription: `${title} description`, overview: `${title} overview`,
    careerCategory: category, industry: "Research and analytics", responsibilities: ["Interpret evidence"],
    requiredEducation: [{ qualification: "Relevant undergraduate study or an alternative evidence-based pathway", educationLevel: "undergraduate", pathwayType: "common", description: "Requirements vary.", disciplines: ["Psychology"] }],
    acceptedDisciplines: [{ name: "Psychology", alignment: "common", notes: "" }],
    essentialSkills: [{ skillId, requiredProficiency: "intermediate", rationale: "Core work" }], desirableSkills: [],
    requiredCertifications: [], recommendedCertifications: [], toolsAndTechnologies: ["Interview guides"],
    entryLevelRoles: [`Junior ${title}`], workEnvironments: ["Cross-functional team"], employmentTypes: ["full_time"], workModes: ["hybrid"],
    relatedCareers: [], careerProgression: [{ level: "entry", roles: [`Junior ${title}`], description: "Scoped work" }],
    learningResources: [], crossDisciplinePathways: [], tags: ["research"], aliases: [], featured: false, popularityRank: 1, status: "active",
  };
}

const careers = [career(ids.ux, "UX Researcher", ids.research, "design_creative"), career(ids.analyst, "Data Analyst", ids.analysis, "software_it")];
const profile = {
  education: [{ academicDiscipline: "Psychology", specialization: "", degree: "BA Psychology" }],
  projects: [{ _id: "507f1f77bcf86cd799439051", title: "Interview study", description: "User research", category: "Research", technologies: ["Interview guides"] }],
  experience: [{ _id: "507f1f77bcf86cd799439052", position: "Research intern", organization: "Lab", experienceType: "internship", description: "User research", skillsUsed: ["User Research"] }],
  certifications: [], preferences: { careerInterests: ["Research"], preferredIndustries: ["Research"], workModes: ["hybrid"], employmentTypes: ["full_time"] },
};
const studentSkills = [{ skillId: ids.research, proficiency: "beginner", evidenceStatus: "self_declared", learningStatus: "learning", evidenceReferences: [] }];

function query(value) { return { lean: jest.fn().mockResolvedValue(value) }; }

function mockContext({ profileValue = profile, studentSkillValue = studentSkills } = {}) {
  StudentProfile.findOne.mockReturnValue(query(profileValue));
  StudentSkill.find.mockReturnValue(query(studentSkillValue));
  Skill.find.mockReturnValue(query(skills));
  Career.find.mockImplementation((filter) => {
    const selected = new Set((filter?._id?.$in || []).map(String));
    return query(careers.filter((item) => selected.has(String(item._id))));
  });
}

beforeEach(() => { jest.resetAllMocks(); mockContext(); });

test("compares careers with transparent scores, prerequisites, education and evidence", async () => {
  const result = await analyzeCareerComparison(ids.user, [ids.ux, ids.analyst]);
  expect(result.careers).toHaveLength(2);
  expect(result.weights).toMatchObject({ skills: 35, education: 20, experienceAndProjects: 15 });
  const ux = result.careers[0];
  expect(ux.alignment.skillsRequiringImprovement[0].skill.name).toBe("User Research");
  expect(ux.preparation.missingPrerequisites[0]).toMatchObject({ skill: expect.objectContaining({ name: "Research Fundamentals" }), status: "missing" });
  expect(ux.preparation.evidenceGaps[0].message).toMatch(/does not yet have/i);
  expect(ux.application.relevantInternships[0].position).toBe("Research intern");
  expect(result.methodology).toMatch(/missing profile factors are excluded/i);
  expect(result.signals.explanation).toMatch(/not.*universally better/i);
});

test("keeps missing profile information unknown instead of forcing a mismatch", async () => {
  mockContext({ profileValue: null, studentSkillValue: [] });
  const result = await analyzeCareerComparison(ids.user, [ids.ux, ids.analyst]);
  expect(result.dataAvailability).toMatchObject({ education: false, skills: false, projects: false, experience: false });
  expect(result.careers.every((item) => item.alignment.score === null)).toBe(true);
  expect(result.careers.every((item) => item.alignment.availableWeight === 0)).toBe(true);
  expect(result.careers.every((item) => item.alignment.missingSkills.length === 0)).toBe(true);
  expect(result.careers.every((item) => item.alignment.unassessedSkills.length === 1)).toBe(true);
  expect(result.careers.every((item) => item.preparation.unassessedRequirements.length === 1)).toBe(true);
  expect(result.careers.every((item) => item.preparation.additionalQualifications[0].matchedByCurrentEducation === null)).toBe(true);
});

test("scenario overrides improve only the simulated view and never mutate actual profile records", async () => {
  const profileBefore = JSON.parse(JSON.stringify(profile));
  const recordsBefore = JSON.parse(JSON.stringify(studentSkills));
  const scenario = {
    _id: ids.scenario1, name: "Research path", targetCareerId: ids.ux, startingPointType: "existing_profile",
    hypotheticalSkills: [{ skillId: ids.research, proficiency: "intermediate" }, { skillId: ids.foundation, proficiency: "beginner" }],
    hypotheticalQualifications: [], weeklyLearningHours: 5, learningPreferences: ["project_based"], targetDate: null, constraints: "", status: "active",
  };
  const result = await analyzeCareerScenario(ids.user, scenario);
  expect(result.actualBaseline.alignment.skillsRequiringImprovement[0].currentProficiency).toBe("beginner");
  expect(result.simulated.alignment.matchingSkills[0]).toMatchObject({ currentProficiency: "intermediate", evidenceStatus: "hypothetical" });
  expect(result.differences.hypotheticalInputs).toEqual(expect.arrayContaining([expect.objectContaining({ source: "hypothetical_override", actualProficiency: "beginner" })]));
  expect(result.differences.actualProfileWasModified).toBe(false);
  expect(profile).toEqual(profileBefore);
  expect(studentSkills).toEqual(recordsBefore);
});

test("compares saved scenarios without declaring a universal winner", async () => {
  const scenarios = [
    { _id: ids.scenario1, name: "Research", targetCareerId: ids.ux, startingPointType: "existing_profile", hypotheticalSkills: [{ skillId: ids.research, proficiency: "intermediate" }], hypotheticalQualifications: [], weeklyLearningHours: 5, learningPreferences: ["mixed"], status: "active" },
    { _id: ids.scenario2, name: "Analytics", targetCareerId: ids.analyst, startingPointType: "existing_profile", hypotheticalSkills: [{ skillId: ids.analysis, proficiency: "beginner" }], hypotheticalQualifications: [], weeklyLearningHours: 8, learningPreferences: ["project_based"], status: "active" },
  ];
  const result = await compareCareerScenarios(ids.user, scenarios);
  expect(result.scenarios).toHaveLength(2);
  expect(result.signals.explanation).toMatch(/not.*universally better/i);
  expect(result.disclaimer).toMatch(/student makes the final choice/i);
});
