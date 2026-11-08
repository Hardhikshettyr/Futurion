jest.mock("../src/models/Skill");
jest.mock("../src/models/StudentSkill");
jest.mock("../src/models/StudentProfile");

const Skill = require("../src/models/Skill");
const StudentSkill = require("../src/models/StudentSkill");
const StudentProfile = require("../src/models/StudentProfile");
const {
  analyzeCompetency,
  recommendSkills,
} = require("../src/services/skillIntelligenceService");

const ids = {
  programming: "507f1f77bcf86cd799439021",
  algorithms: "507f1f77bcf86cd799439022",
  databases: "507f1f77bcf86cd799439023",
};

const skills = [
  {
    _id: ids.programming,
    name: "Programming Fundamentals",
    slug: "programming-fundamentals",
    category: "technical",
    difficultyLevel: "foundational",
    status: "active",
    prerequisites: [],
    relatedSkills: [],
  },
  {
    _id: ids.algorithms,
    name: "Data Structures and Algorithms",
    slug: "data-structures-and-algorithms",
    category: "technical",
    difficultyLevel: "intermediate",
    status: "active",
    prerequisites: [ids.programming],
    relatedSkills: [ids.databases],
  },
  {
    _id: ids.databases,
    name: "Database Design",
    slug: "database-design",
    category: "technical",
    difficultyLevel: "intermediate",
    status: "active",
    prerequisites: [ids.programming],
    relatedSkills: [ids.algorithms],
  },
];

function queryResult(value) {
  const query = {
    lean: jest.fn().mockResolvedValue(value),
    select: jest.fn(),
    sort: jest.fn(),
  };
  query.select.mockReturnValue(query);
  query.sort.mockReturnValue(query);
  return query;
}

function mockData(records, profile = null) {
  Skill.find.mockReturnValue(queryResult(skills));
  StudentSkill.find.mockReturnValue(queryResult(records));
  StudentProfile.findOne.mockReturnValue(queryResult(profile));
}

beforeEach(() => {
  jest.resetAllMocks();
});

test("reports missing skills, proficiency gaps, evidence, and prerequisites transparently", async () => {
  mockData([
    {
      skillId: ids.algorithms,
      proficiency: "beginner",
      evidenceStatus: "self_declared",
      learningStatus: "learning",
    },
  ]);
  const result = await analyzeCompetency("507f1f77bcf86cd799439011", [
    { skillId: ids.algorithms, requiredProficiency: "advanced" },
    { skillId: ids.programming, requiredProficiency: "beginner" },
  ]);

  expect(result.requirements[0]).toMatchObject({
    belowRequired: true,
    proficiencyGap: 2,
    insufficientEvidence: true,
    prerequisitesMissing: true,
  });
  expect(result.requirements[1].missing).toBe(true);
  expect(result.summary).toMatchObject({
    missingSkills: 1,
    belowRequiredProficiency: 1,
    insufficientEvidence: 1,
    incompletePrerequisites: 1,
    proficiencyCoverage: 17,
  });
  expect(result.summary.calculation).toMatch(/capped|required level|average/i);
  expect(result.summary.disclaimer).toMatch(/not.*hiring probability/i);
});

test("recognizes proficiency matches without treating self declarations as evidence", async () => {
  mockData([
    {
      skillId: ids.algorithms,
      proficiency: "advanced",
      evidenceStatus: "demonstrated",
      learningStatus: "proficient",
    },
    {
      skillId: ids.programming,
      proficiency: "intermediate",
      evidenceStatus: "self_declared",
      learningStatus: "proficient",
    },
  ]);
  const result = await analyzeCompetency("507f1f77bcf86cd799439011", [
    { skillId: ids.algorithms, requiredProficiency: "advanced" },
  ]);
  expect(result.summary.proficiencyCoverage).toBe(100);
  expect(result.requirements[0]).toMatchObject({
    meetsProficiency: true,
    insufficientEvidence: false,
    prerequisitesMissing: false,
  });
});

test("recommends missing foundations and related skills using curated relationships", async () => {
  mockData([
    {
      skillId: ids.algorithms,
      proficiency: "advanced",
      evidenceStatus: "demonstrated",
      learningStatus: "proficient",
    },
  ]);
  const result = await recommendSkills("507f1f77bcf86cd799439011");
  const foundation = result.items.find((item) => item.skill.id === ids.programming);
  const related = result.items.find((item) => item.skill.id === ids.databases);
  expect(foundation).toMatchObject({ recommendationType: "missing_foundation", priority: "high" });
  expect(related).toMatchObject({ recommendationType: "related_strength" });
  expect(result.methodology).toMatch(/deterministic|curated/i);
});

test("returns deterministic broad foundations for an empty profile", async () => {
  mockData([]);
  const result = await recommendSkills("507f1f77bcf86cd799439011");
  expect(result.items.length).toBeGreaterThan(0);
  expect(result.items.every((item) => item.recommendationType === "foundation_exploration")).toBe(true);
});

test("recommends next skills only after curated prerequisites are complete", async () => {
  mockData([
    {
      skillId: ids.programming,
      proficiency: "intermediate",
      evidenceStatus: "self_declared",
      learningStatus: "proficient",
    },
  ]);
  const result = await recommendSkills("507f1f77bcf86cd799439011");
  expect(result.items).toEqual(expect.arrayContaining([
    expect.objectContaining({
      skill: expect.objectContaining({ id: ids.algorithms }),
      recommendationType: "next_skill",
    }),
  ]));
});

test("uses declared interests without claiming the recommended skill", async () => {
  mockData([], {
    education: [],
    preferences: { careerInterests: ["Database design"] },
  });
  const result = await recommendSkills("507f1f77bcf86cd799439011");
  expect(result.items).toEqual(expect.arrayContaining([
    expect.objectContaining({
      skill: expect.objectContaining({ id: ids.databases }),
      recommendationType: "declared_interest",
    }),
  ]));
});

test("connects recommendations to owned projects without claiming or auto-adding the skill", async () => {
  mockData([], {
    education: [],
    preferences: {},
    projects: [{ title: "Campus data model", technologies: ["Database Design"], category: "Data" }],
    certifications: [],
    experience: [],
  });
  const result = await recommendSkills("507f1f77bcf86cd799439011");
  expect(result.items).toEqual(expect.arrayContaining([
    expect.objectContaining({
      skill: expect.objectContaining({ id: ids.databases }),
      recommendationType: "profile_evidence_candidate",
      isTracked: false,
      reason: expect.stringMatching(/project.*Campus data model.*Database Design/i),
      nextSteps: expect.stringMatching(/review|add/i),
    }),
  ]));
});
