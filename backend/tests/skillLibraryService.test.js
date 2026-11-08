jest.mock("../src/models/Skill");

const Skill = require("../src/models/Skill");
const {
  assertIdentityAvailable,
  assertNoPrerequisiteCycle,
  listSkills,
  validateReferences,
} = require("../src/services/skillLibraryService");

function chainResult(value) {
  const query = {
    lean: jest.fn().mockResolvedValue(value),
    limit: jest.fn(),
    select: jest.fn(),
    skip: jest.fn(),
    sort: jest.fn(),
  };
  query.limit.mockReturnValue(query);
  query.select.mockReturnValue(query);
  query.skip.mockReturnValue(query);
  query.sort.mockReturnValue(query);
  return query;
}

beforeEach(() => {
  jest.resetAllMocks();
});

test("builds search, category, status, and pagination queries", async () => {
  Skill.find.mockReturnValue(chainResult([
    { _id: "507f1f77bcf86cd799439031", name: "Legal Research", slug: "legal-research", category: "domain_specific", status: "active" },
  ]));
  Skill.countDocuments.mockResolvedValue(21);
  const result = await listSkills({ q: "legal", category: "domain_specific", page: 2, limit: 10 });
  expect(Skill.find).toHaveBeenCalledWith(expect.objectContaining({
    category: "domain_specific",
    status: "active",
    $or: expect.any(Array),
  }));
  expect(result.pagination).toEqual({ page: 2, limit: 10, total: 21, totalPages: 3 });
});

test("prevents names from colliding with another skill alias", async () => {
  Skill.findOne.mockReturnValue(chainResult({ name: "JavaScript" }));
  await expect(assertIdentityAvailable({ name: "JS", aliases: [] })).rejects.toMatchObject({
    code: "SKILL_IDENTITY_DUPLICATE",
    status: 409,
  });
});

test("rejects missing or inactive relationship references", async () => {
  Skill.countDocuments.mockResolvedValue(1);
  await expect(validateReferences({
    currentId: "507f1f77bcf86cd799439031",
    parentSkillId: null,
    relatedSkills: ["507f1f77bcf86cd799439032", "507f1f77bcf86cd799439033"],
    prerequisites: [],
  })).rejects.toMatchObject({ code: "SKILL_REFERENCE_INVALID" });
});

test("prevents direct self references", async () => {
  await expect(validateReferences({
    currentId: "507f1f77bcf86cd799439031",
    parentSkillId: null,
    relatedSkills: [],
    prerequisites: ["507f1f77bcf86cd799439031"],
  })).rejects.toMatchObject({ code: "SKILL_SELF_REFERENCE" });
  expect(Skill.countDocuments).not.toHaveBeenCalled();
});

test("detects transitive prerequisite cycles", async () => {
  const target = "507f1f77bcf86cd799439031";
  const proposed = "507f1f77bcf86cd799439032";
  Skill.find.mockReturnValue(chainResult([
    { _id: target, prerequisites: [] },
    { _id: proposed, prerequisites: ["507f1f77bcf86cd799439033"] },
    { _id: "507f1f77bcf86cd799439033", prerequisites: [target] },
  ]));
  await expect(assertNoPrerequisiteCycle(target, [proposed])).rejects.toMatchObject({
    code: "SKILL_PREREQUISITE_CYCLE",
  });
});
