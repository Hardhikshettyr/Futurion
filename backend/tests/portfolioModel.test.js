const mongoose = require("mongoose");
const PortfolioSettings = require("../src/models/PortfolioSettings");

test("keeps public access and section visibility disabled by default", async () => {
  const settings = new PortfolioSettings({ userId: new mongoose.Types.ObjectId() });
  await expect(settings.validate()).resolves.toBeUndefined();
  expect(settings.isPublic).toBe(false);
  expect(settings.visibleSections).toEqual([]);
});

test("normalizes slugs, prevents duplicates in selections and rejects reserved slugs", async () => {
  const settings = new PortfolioSettings({ userId: new mongoose.Types.ObjectId(), publicSlug: "Jane--Career", visibleSections: ["skills", "skills"], selectedAchievementKeys: ["first-project", "first-project"] });
  await expect(settings.validate()).resolves.toBeUndefined();
  expect(settings.publicSlug).toBe("jane-career");
  expect(settings.visibleSections).toEqual(["skills"]);
  expect(settings.selectedAchievementKeys).toEqual(["first-project"]);
  await expect(new PortfolioSettings({ userId: new mongoose.Types.ObjectId(), publicSlug: "admin" }).validate()).rejects.toThrow(/reserved/i);
});

test("defines unique ownership and public-slug indexes", () => {
  const indexes = PortfolioSettings.schema.indexes();
  expect(indexes.some(([fields, options]) => fields.userId === 1 && options.unique)).toBe(true);
  expect(indexes.some(([fields, options]) => fields.publicSlug === 1 && options.unique)).toBe(true);
});
