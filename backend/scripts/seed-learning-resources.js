require("dotenv").config();

const mongoose = require("mongoose");
const { connectToDatabase } = require("../src/config/database");
const categorySeedData = require("../src/data/learningCategorySeedData");
const resourceSeedData = require("../src/data/learningResourceSeedData");
const LearningResource = require("../src/models/LearningResource");
const LearningResourceCategory = require("../src/models/LearningResourceCategory");
const Skill = require("../src/models/Skill");
const {
  learningSlug,
  normalizeExternalUrl,
  normalizeLearningIdentity,
} = require("../src/utils/learningTaxonomy");

function validateLearningSeed(resources, availableSkillSlugs = null, availableCategorySlugs = null) {
  const urls = resources.map((item) => normalizeExternalUrl(item.externalUrl));
  if (new Set(urls).size !== urls.length) throw new Error("Learning seed contains duplicate URLs");
  const identities = resources.map((item) => `${normalizeLearningIdentity(item.title)}::${normalizeLearningIdentity(item.provider)}`);
  if (new Set(identities).size !== identities.length) throw new Error("Learning seed contains duplicate title/provider pairs");
  resources.forEach((resource) => {
    const skillSlugs = [...(resource.skillsCovered || []), ...(resource.prerequisites || [])];
    if (new Set(resource.skillsCovered || []).size !== (resource.skillsCovered || []).length) {
      throw new Error(`${resource.title} duplicates a covered skill`);
    }
    if (availableSkillSlugs) {
      const missing = skillSlugs.find((slug) => !availableSkillSlugs.has(slug));
      if (missing) throw new Error(`${resource.title} references unknown skill ${missing}`);
    }
    if (availableCategorySlugs && !availableCategorySlugs.has(resource.category)) {
      throw new Error(`${resource.title} references unknown category ${resource.category}`);
    }
  });
}

async function run() {
  validateLearningSeed(resourceSeedData);
  await connectToDatabase();
  for (const category of categorySeedData) {
    const slug = learningSlug(category.name);
    await LearningResourceCategory.updateOne(
      { slug },
      { $set: { ...category, normalizedName: normalizeLearningIdentity(category.name) }, $setOnInsert: { slug, status: "active", createdBy: null } },
      { upsert: true, runValidators: true },
    );
  }
  const [skills, categories] = await Promise.all([
    Skill.find({ status: "active" }).select("slug").lean(),
    LearningResourceCategory.find({ status: "active" }).lean(),
  ]);
  const skillBySlug = new Map(skills.map((skill) => [skill.slug, skill]));
  const categoryBySlug = new Map(categories.map((category) => [category.slug, category]));
  validateLearningSeed(resourceSeedData, new Set(skillBySlug.keys()), new Set(categoryBySlug.keys()));

  for (const entry of resourceSeedData) {
    const normalizedUrl = normalizeExternalUrl(entry.externalUrl);
    await LearningResource.updateOne(
      { normalizedUrl },
      { $set: {
        ...entry,
        externalUrl: normalizedUrl,
        normalizedUrl,
        normalizedTitle: normalizeLearningIdentity(entry.title),
        normalizedProvider: normalizeLearningIdentity(entry.provider),
        skillsCovered: entry.skillsCovered.map((slug) => skillBySlug.get(slug)._id),
        prerequisites: entry.prerequisites.map((slug) => skillBySlug.get(slug)._id),
        categoryId: categoryBySlug.get(entry.category)._id,
        priceAmount: entry.priceType === "free" ? 0 : null,
        currency: "",
      }, $unset: { category: "" }, $setOnInsert: { status: "active", createdBy: null } },
      { upsert: true, runValidators: true },
    );
  }
  console.log(`Learning seed complete: ${resourceSeedData.length} curated resources available`);
  await mongoose.disconnect();
}

if (require.main === module) {
  run().catch(async (error) => {
    console.error(`Learning seed failed: ${error.message}`);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  });
}

module.exports = { run, validateLearningSeed };
