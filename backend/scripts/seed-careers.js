require("dotenv").config();

const mongoose = require("mongoose");
const { connectToDatabase } = require("../src/config/database");
const careerSeedData = require("../src/data/careerSeedData");
const Career = require("../src/models/Career");
const Skill = require("../src/models/Skill");
const {
  CAREER_CATEGORIES,
  careerSlug,
  normalizeCareerIdentity,
} = require("../src/utils/careerTaxonomy");

function validateCareerSeed(entries, availableSkillSlugs = null) {
  const careerSlugs = new Set(entries.map((entry) => careerSlug(entry.title)));
  if (careerSlugs.size !== entries.length) throw new Error("Career seed contains duplicate titles or slugs");
  entries.forEach((entry) => {
    if (!CAREER_CATEGORIES.includes(entry.careerCategory)) {
      throw new Error(`${entry.title} uses an unsupported career category`);
    }
    const related = entry.related || [];
    if (new Set(related).size !== related.length || related.includes(careerSlug(entry.title))) {
      throw new Error(`${entry.title} contains a duplicate or self-related career`);
    }
    const missingCareer = related.find((slug) => !careerSlugs.has(slug));
    if (missingCareer) throw new Error(`${entry.title} references unknown career ${missingCareer}`);

    const mappedSkillSlugs = [
      ...(entry.essentialSkills || []).map((item) => item.slug),
      ...(entry.desirableSkills || []).map((item) => item.slug),
    ];
    if (new Set(mappedSkillSlugs).size !== mappedSkillSlugs.length) {
      throw new Error(`${entry.title} duplicates a Skill Library reference`);
    }
    (entry.crossDisciplinePathways || []).forEach((pathway) => {
      if (new Set(pathway.additionalSkills || []).size !== (pathway.additionalSkills || []).length) {
        throw new Error(`${entry.title} duplicates a cross-discipline skill reference`);
      }
    });
    const skillSlugs = [
      ...mappedSkillSlugs,
      ...(entry.crossDisciplinePathways || []).flatMap((item) => item.additionalSkills || []),
    ];
    if (availableSkillSlugs) {
      const missingSkill = skillSlugs.find((slug) => !availableSkillSlugs.has(slug));
      if (missingSkill) throw new Error(`${entry.title} references unknown skill ${missingSkill}`);
    }
  });
}

async function run() {
  validateCareerSeed(careerSeedData);
  await connectToDatabase();
  const skills = await Skill.find({ status: "active" }).select("slug").lean();
  const skillBySlug = new Map(skills.map((skill) => [skill.slug, skill]));
  validateCareerSeed(careerSeedData, new Set(skillBySlug.keys()));

  for (const entry of careerSeedData) {
    const {
      essentialSkills,
      desirableSkills,
      crossDisciplinePathways,
      related,
      ...fields
    } = entry;
    const slug = careerSlug(entry.title);
    await Career.updateOne(
      { slug },
      {
        $set: {
          ...fields,
          title: entry.title,
          normalizedTitle: normalizeCareerIdentity(entry.title),
          normalizedAliases: (entry.aliases || []).map(normalizeCareerIdentity),
        },
        $setOnInsert: { slug, status: "active", createdBy: null },
      },
      { upsert: true, runValidators: true },
    );
  }

  const careers = await Career.find({ slug: { $in: careerSeedData.map((entry) => careerSlug(entry.title)) } });
  const careerBySlug = new Map(careers.map((career) => [career.slug, career]));
  const relatedBySlug = new Map(careerSeedData.map((entry) => [careerSlug(entry.title), new Set()]));
  careerSeedData.forEach((entry) => {
    const source = careerSlug(entry.title);
    (entry.related || []).forEach((target) => {
      relatedBySlug.get(source).add(target);
      relatedBySlug.get(target).add(source);
    });
  });

  for (const entry of careerSeedData) {
    const career = careerBySlug.get(careerSlug(entry.title));
    const mapSkills = (items = []) => items.map(({ slug, ...relationship }) => ({
      ...relationship,
      skillId: skillBySlug.get(slug)._id,
    }));
    const crossDisciplinePathways = (entry.crossDisciplinePathways || []).map((pathway) => ({
      ...pathway,
      additionalSkills: (pathway.additionalSkills || []).map((slug) => skillBySlug.get(slug)._id),
    }));
    await Career.updateOne(
      { _id: career._id },
      {
        $set: {
          essentialSkills: mapSkills(entry.essentialSkills),
          desirableSkills: mapSkills(entry.desirableSkills),
          crossDisciplinePathways,
          relatedCareers: [...relatedBySlug.get(career.slug)].map((slug) => careerBySlug.get(slug)._id),
        },
      },
      { runValidators: true },
    );
  }

  console.log(`Career seed complete: ${careers.length} curated careers available`);
  await mongoose.disconnect();
}

if (require.main === module) {
  run().catch(async (error) => {
    console.error(`Career seed failed: ${error.message}`);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  });
}

module.exports = { run, validateCareerSeed };
