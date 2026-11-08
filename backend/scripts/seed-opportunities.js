require("dotenv").config();

const mongoose = require("mongoose");
const { connectToDatabase } = require("../src/config/database");
const opportunitySeedData = require("../src/data/opportunitySeedData");
const Career = require("../src/models/Career");
const Opportunity = require("../src/models/Opportunity");
const Skill = require("../src/models/Skill");
const { normalizeOpportunityIdentity, normalizeOpportunityUrl, opportunitySlug } = require("../src/utils/opportunityTaxonomy");

function validateOpportunitySeed(records, careerSlugs = null, skillSlugs = null) {
  const identities = records.map((item) => normalizeOpportunityIdentity(`${item.organization}::${item.title}`));
  const urls = records.map((item) => normalizeOpportunityUrl(item.externalApplicationUrl));
  if (new Set(identities).size !== identities.length) throw new Error("Opportunity seed contains duplicate organization/title identities");
  if (new Set(urls).size !== urls.length) throw new Error("Opportunity seed contains duplicate external URLs");
  records.forEach((item) => {
    if (new Set(item.careers || []).size !== (item.careers || []).length) throw new Error(`${item.title} duplicates a career reference`);
    const skills = (item.requiredSkills || []).map((skill) => skill.slug);
    if (new Set(skills).size !== skills.length) throw new Error(`${item.title} duplicates a Skill reference`);
    if (careerSlugs) {
      const missing = (item.careers || []).find((slug) => !careerSlugs.has(slug));
      if (missing) throw new Error(`${item.title} references unknown Career ${missing}`);
    }
    if (skillSlugs) {
      const missing = skills.find((slug) => !skillSlugs.has(slug));
      if (missing) throw new Error(`${item.title} references unknown Skill ${missing}`);
    }
  });
}

async function run() {
  validateOpportunitySeed(opportunitySeedData);
  await connectToDatabase();
  const [careers, skills] = await Promise.all([
    Career.find({ status: "active" }).select("slug").lean(),
    Skill.find({ status: "active" }).select("slug").lean(),
  ]);
  const careerBySlug = new Map(careers.map((item) => [item.slug, item]));
  const skillBySlug = new Map(skills.map((item) => [item.slug, item]));
  validateOpportunitySeed(opportunitySeedData, new Set(careerBySlug.keys()), new Set(skillBySlug.keys()));
  for (const entry of opportunitySeedData) {
    const normalizedIdentity = normalizeOpportunityIdentity(`${entry.organization}::${entry.title}`);
    const externalApplicationUrl = normalizeOpportunityUrl(entry.externalApplicationUrl);
    await Opportunity.updateOne(
      { normalizedIdentity },
      { $set: {
        ...entry,
        normalizedIdentity,
        slug: opportunitySlug(`${entry.organization}-${entry.title}`),
        careerIds: entry.careers.map((slug) => careerBySlug.get(slug)._id),
        requiredSkills: entry.requiredSkills.map(({ slug, ...requirement }) => ({ ...requirement, skillId: skillBySlug.get(slug)._id })),
        applicationDeadline: entry.applicationDeadline ? new Date(`${entry.applicationDeadline}T23:59:59.999Z`) : null,
        externalApplicationUrl,
        externalUrlVerified: true,
        sourceVerifiedAt: new Date(),
      }, $unset: { careers: "" }, $setOnInsert: { status: "active", createdBy: null } },
      { upsert: true, runValidators: true },
    );
  }
  console.log(`Opportunity seed complete: ${opportunitySeedData.length} curated official opportunities available`);
  await mongoose.disconnect();
}

if (require.main === module) {
  run().catch(async (error) => {
    console.error(`Opportunity seed failed: ${error.message}`);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  });
}

module.exports = { run, validateOpportunitySeed };
