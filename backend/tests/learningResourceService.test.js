jest.mock("../src/models/LearningResource", () => ({ findOne: jest.fn() }));
jest.mock("../src/models/LearningResourceCategory", () => ({ exists: jest.fn() }));
jest.mock("../src/models/Skill", () => ({ countDocuments: jest.fn() }));
jest.mock("../src/models/StudentLearningResource", () => ({}));

const LearningResource = require("../src/models/LearningResource");
const LearningResourceCategory = require("../src/models/LearningResourceCategory");
const Skill = require("../src/models/Skill");
const { assertResourceAvailable, buildResourceFilter, validateResourceReferences } = require("../src/services/learningResourceService");

const ids = { skill: "507f1f77bcf86cd799439011", category: "507f1f77bcf86cd799439012" };

test("builds database-backed search, skill, type, price, provider and difficulty filters", () => {
  const filter = buildResourceFilter({ q: "python", skillId: ids.skill, resourceType: "documentation", priceType: "free", provider: "Python Software Foundation", difficulty: "beginner" });
  expect(filter).toMatchObject({ status: "active", skillsCovered: ids.skill, resourceType: "documentation", priceType: "free", difficulty: "beginner" });
  expect(filter.$or).toHaveLength(3);
  expect(filter.provider).toBeInstanceOf(RegExp);
});

test("validates every central Skill and category reference", async () => {
  Skill.countDocuments.mockResolvedValue(1);
  LearningResourceCategory.exists.mockResolvedValue({ _id: ids.category });
  await expect(validateResourceReferences({ skillsCovered: [ids.skill], prerequisites: [], categoryId: ids.category })).resolves.toBeUndefined();
  Skill.countDocuments.mockResolvedValue(0);
  await expect(validateResourceReferences({ skillsCovered: [ids.skill], prerequisites: [], categoryId: ids.category })).rejects.toMatchObject({ code: "LEARNING_SKILL_REFERENCE_INVALID" });
});

test("prevents duplicate URL and title/provider identities", async () => {
  LearningResource.findOne.mockReturnValue({ select: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ title: "Python Tutorial" }) }) });
  await expect(assertResourceAvailable({ title: "Python Tutorial", provider: "PSF", externalUrl: "https://docs.python.org/3/tutorial/" })).rejects.toMatchObject({ code: "LEARNING_RESOURCE_DUPLICATE" });
});
