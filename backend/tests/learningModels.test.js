const mongoose = require("mongoose");
const LearningResource = require("../src/models/LearningResource");
const LearningResourceCategory = require("../src/models/LearningResourceCategory");
const StudentLearningResource = require("../src/models/StudentLearningResource");

test("normalizes a valid HTTPS learning resource and deduplicates Skill references", async () => {
  const skillId = new mongoose.Types.ObjectId();
  const resource = new LearningResource({
    title: "  Python   Tutorial ", description: "Official tutorial material.", resourceType: "documentation",
    provider: " Python Software Foundation ", externalUrl: "https://docs.python.org/3/tutorial/#start",
    skillsCovered: [skillId, skillId], prerequisites: [], difficulty: "beginner", priceType: "free",
    categoryId: new mongoose.Types.ObjectId(),
  });
  await resource.validate();
  expect(resource.title).toBe("Python Tutorial");
  expect(resource.normalizedTitle).toBe("python tutorial");
  expect(resource.externalUrl).toBe("https://docs.python.org/3/tutorial");
  expect(resource.skillsCovered).toHaveLength(1);
  expect(resource.priceAmount).toBe(0);
});

test("rejects missing, malformed, or insecure resource URLs", async () => {
  const base = { title: "Resource", description: "Description", resourceType: "course", provider: "Provider", skillsCovered: [], prerequisites: [], difficulty: "beginner", categoryId: new mongoose.Types.ObjectId() };
  await expect(new LearningResource({ ...base, externalUrl: "" }).validate()).rejects.toThrow(/externalUrl/i);
  await expect(new LearningResource({ ...base, externalUrl: "not-a-url" }).validate()).rejects.toThrow(/externalUrl/i);
  await expect(new LearningResource({ ...base, externalUrl: "http://example.com/course" }).validate()).rejects.toThrow(/externalUrl/i);
});

test("defines duplicate-prevention and student ownership indexes", () => {
  const resourceIndexes = LearningResource.schema.indexes();
  expect(resourceIndexes.some(([fields, options]) => fields.normalizedUrl === 1 && options.unique)).toBe(true);
  expect(resourceIndexes.some(([fields, options]) => fields.normalizedTitle === 1 && fields.normalizedProvider === 1 && options.unique)).toBe(true);
  expect(StudentLearningResource.schema.indexes().some(([fields, options]) => fields.userId === 1 && fields.resourceId === 1 && options.unique)).toBe(true);
});

test("normalizes managed resource categories", async () => {
  const category = new LearningResourceCategory({ name: " Data & AI ", description: "Analytics resources" });
  await category.validate();
  expect(category.normalizedName).toBe("data & ai");
  expect(category.slug).toBe("data-and-ai");
});
