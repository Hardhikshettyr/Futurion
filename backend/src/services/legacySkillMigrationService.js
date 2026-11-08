const Skill = require("../models/Skill");
const StudentProfile = require("../models/StudentProfile");
const StudentSkill = require("../models/StudentSkill");
const { normalizeSkillIdentity } = require("../utils/skillTaxonomy");

function legacyLearningStatus(evidenceStatus) {
  return evidenceStatus === "currently_learning" ? "learning" : "proficient";
}

function linkedLegacyEvidence(profile, legacySkill) {
  const evidence = [];
  if (legacySkill.associatedProject) {
    const project = profile.projects.find(
      (item) => normalizeSkillIdentity(item.title) === normalizeSkillIdentity(legacySkill.associatedProject),
    );
    evidence.push({
      evidenceType: "project",
      referenceId: project?._id || null,
      description: `Legacy project evidence: ${legacySkill.associatedProject}`,
      ownerUserId: profile.userId,
    });
  }
  if (legacySkill.associatedCertification) {
    const certification = profile.certifications.find(
      (item) => normalizeSkillIdentity(item.name) === normalizeSkillIdentity(legacySkill.associatedCertification),
    );
    evidence.push({
      evidenceType: "certification",
      referenceId: certification?._id || null,
      description: `Legacy certification evidence: ${legacySkill.associatedCertification}`,
      ownerUserId: profile.userId,
    });
  }
  return evidence;
}

async function skillIdentityMap() {
  const skills = await Skill.find({}).select("name aliases +normalizedName +normalizedAliases").lean();
  const map = new Map();
  skills.forEach((skill) => {
    map.set(skill.normalizedName || normalizeSkillIdentity(skill.name), skill);
    (skill.normalizedAliases || skill.aliases.map(normalizeSkillIdentity)).forEach((alias) => {
      if (!map.has(alias)) map.set(alias, skill);
    });
  });
  return map;
}

async function migrateProfileSkills(profile, identities, { dryRun = false } = {}) {
  const report = { profileId: String(profile._id), matched: 0, created: 0, existing: 0, unmatched: [] };
  for (const legacySkill of profile.skills || []) {
    const skill = identities.get(normalizeSkillIdentity(legacySkill.name));
    if (!skill) {
      report.unmatched.push(legacySkill.name);
      continue;
    }
    report.matched += 1;
    const existing = await StudentSkill.exists({ userId: profile.userId, skillId: skill._id });
    if (existing) {
      report.existing += 1;
      continue;
    }
    if (!dryRun) {
      const evidenceReferences = linkedLegacyEvidence(profile, legacySkill);
      await StudentSkill.create({
        userId: profile.userId,
        studentProfileId: profile._id,
        skillId: skill._id,
        proficiency: legacySkill.proficiency,
        evidenceStatus: legacySkill.evidenceStatus || "self_declared",
        learningStatus: legacyLearningStatus(legacySkill.evidenceStatus),
        description: legacySkill.description || "",
        evidenceReferences,
      });
    }
    report.created += 1;
  }
  return report;
}

async function migrateAllLegacySkills({ dryRun = false } = {}) {
  const identities = await skillIdentityMap();
  const reports = [];
  const cursor = StudentProfile.find({ "skills.0": { $exists: true } }).cursor();
  for await (const profile of cursor) {
    reports.push(await migrateProfileSkills(profile, identities, { dryRun }));
  }
  return {
    dryRun,
    profilesProcessed: reports.length,
    matched: reports.reduce((sum, report) => sum + report.matched, 0),
    created: reports.reduce((sum, report) => sum + report.created, 0),
    existing: reports.reduce((sum, report) => sum + report.existing, 0),
    unmatched: reports.flatMap((report) =>
      report.unmatched.map((name) => ({ profileId: report.profileId, name })),
    ),
  };
}

module.exports = {
  linkedLegacyEvidence,
  migrateAllLegacySkills,
  migrateProfileSkills,
  skillIdentityMap,
};
