require("dotenv").config();

const mongoose = require("mongoose");
const { connectToDatabase } = require("../src/config/database");
const skillSeedData = require("../src/data/skillSeedData");
const Skill = require("../src/models/Skill");
const { normalizeSkillIdentity, skillSlug } = require("../src/utils/skillTaxonomy");

function prerequisiteSlug(value) {
  return typeof value === "string" ? value : value.slug;
}

function validateSeedGraph(entries) {
  const slugs = new Set(entries.map((entry) => skillSlug(entry.name)));
  const graph = new Map();
  entries.forEach((entry) => {
    const slug = skillSlug(entry.name);
    const prerequisites = (entry.prerequisites || []).map(prerequisiteSlug);
    const missing = [...prerequisites, ...(entry.related || [])].find(
      (reference) => !slugs.has(reference),
    );
    if (missing) throw new Error(`${entry.name} references unknown seed skill ${missing}`);
    if (new Set(prerequisites).size !== prerequisites.length) {
      throw new Error(`${entry.name} contains a duplicate prerequisite`);
    }
    graph.set(slug, prerequisites);
  });

  const visiting = new Set();
  const visited = new Set();
  function visit(slug) {
    if (visiting.has(slug)) throw new Error(`Curated prerequisite cycle detected at ${slug}`);
    if (visited.has(slug)) return;
    visiting.add(slug);
    (graph.get(slug) || []).forEach(visit);
    visiting.delete(slug);
    visited.add(slug);
  }
  graph.forEach((_value, slug) => visit(slug));
}

async function run() {
  validateSeedGraph(skillSeedData);
  await connectToDatabase();
  for (const entry of skillSeedData) {
    const { prerequisites, related, ...fields } = entry;
    const slug = skillSlug(entry.name);
    await Skill.updateOne(
      { slug },
      {
        $set: {
          ...fields,
          name: entry.name,
          normalizedName: normalizeSkillIdentity(entry.name),
          normalizedAliases: entry.aliases.map(normalizeSkillIdentity),
        },
        $setOnInsert: {
          slug,
          status: "active",
          createdBy: null,
        },
      },
      { upsert: true, runValidators: true },
    );
  }

  const skills = await Skill.find({ slug: { $in: skillSeedData.map((entry) => skillSlug(entry.name)) } });
  const bySlug = new Map(skills.map((skill) => [skill.slug, skill]));
  const relatedBySlug = new Map(skillSeedData.map((entry) => [skillSlug(entry.name), new Set()]));
  skillSeedData.forEach((entry) => {
    const source = skillSlug(entry.name);
    (entry.related || []).forEach((target) => {
      relatedBySlug.get(source).add(target);
      relatedBySlug.get(target).add(source);
    });
  });
  for (const entry of skillSeedData) {
    const skill = bySlug.get(skillSlug(entry.name));
    const prerequisiteRules = (entry.prerequisites || []).map((value) => {
      const rule = typeof value === "string" ? { slug: value } : value;
      return {
        skillId: bySlug.get(rule.slug)._id,
        importance: rule.importance || "essential",
        minimumProficiency: rule.minimumProficiency || "beginner",
        requiredForLevels: rule.requiredForLevels || [],
      };
    });
    const relatedIds = [...relatedBySlug.get(skill.slug)].map((slug) => bySlug.get(slug)._id);
    await Skill.updateOne(
      { _id: skill._id },
      {
        $set: {
          prerequisites: prerequisiteRules.map((rule) => rule.skillId),
          prerequisiteRules,
          relatedSkills: relatedIds,
        },
      },
      { runValidators: true },
    );
  }
  console.log(`Skill seed complete: ${skills.length} curated skills available`);
  await mongoose.disconnect();
}

if (require.main === module) {
  run().catch(async (error) => {
    console.error(`Skill seed failed: ${error.message}`);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  });
}

module.exports = { prerequisiteSlug, run, validateSeedGraph };
