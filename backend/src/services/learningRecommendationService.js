const Career = require("../models/Career");
const CareerComparison = require("../models/CareerComparison");
const LearningResource = require("../models/LearningResource");
const Skill = require("../models/Skill");
const StudentCareer = require("../models/StudentCareer");
const StudentLearningResource = require("../models/StudentLearningResource");
const StudentProfile = require("../models/StudentProfile");
const StudentSkill = require("../models/StudentSkill");
const { PROFICIENCY_VALUES } = require("../utils/skillTaxonomy");
const { textMatch } = require("./careerRecommendationService");
const { presentResource, presentStudentState } = require("./learningResourceService");

function addTarget(targets, skillId, values) {
  const id = String(skillId);
  const current = targets.get(id) || { priority: 0, reasons: new Set(), careers: new Set(), prerequisiteFor: new Set() };
  current.priority = Math.max(current.priority, values.priority);
  if (values.reason) current.reasons.add(values.reason);
  if (values.career) current.careers.add(values.career);
  if (values.prerequisiteFor) current.prerequisiteFor.add(values.prerequisiteFor);
  targets.set(id, current);
}

function profileInterestSignals(profile) {
  const preferences = profile?.preferences || {};
  return [
    ...(preferences.careerInterests || []),
    ...(preferences.preferredRoles || []),
    ...(preferences.preferredIndustries || []),
    ...(preferences.areasToExplore || []),
  ].filter(Boolean);
}

function careerMatchesInterests(career, interests) {
  const values = [career.title, career.industry, career.careerCategory, ...(career.tags || []), ...(career.aliases || [])];
  return interests.some((interest) => values.some((value) => textMatch(interest, value)));
}

async function loadRecommendationContext(userId) {
  const [profile, studentSkills, skills, savedCareers, comparisons, careers, resources, learningStates] = await Promise.all([
    StudentProfile.findOne({ userId }).lean(),
    StudentSkill.find({ userId }).lean(),
    Skill.find({ status: "active" }).lean(),
    StudentCareer.find({ userId, savedAt: { $ne: null } }).select("careerId").lean(),
    CareerComparison.find({ userId }).select("careerIds").lean(),
    Career.find({ status: "active" }).lean(),
    LearningResource.find({ status: "active" })
      .populate("skillsCovered prerequisites", "name slug category status")
      .populate("categoryId", "name slug description status").lean(),
    StudentLearningResource.find({ userId }).lean(),
  ]);
  return { profile, studentSkills, skills, savedCareers, comparisons, careers, resources, learningStates };
}

function buildLearningTargets(context) {
  const skillById = new Map(context.skills.map((skill) => [String(skill._id), skill]));
  const studentBySkill = new Map(context.studentSkills.map((record) => [String(record.skillId), record]));
  const selectedCareerIds = new Set([
    ...context.savedCareers.map((item) => String(item.careerId)),
    ...context.comparisons.flatMap((item) => item.careerIds || []).map(String),
  ]);
  const interests = profileInterestSignals(context.profile);
  const targetCareers = context.careers.filter((career) =>
    selectedCareerIds.has(String(career._id)) || careerMatchesInterests(career, interests));
  const targets = new Map();

  targetCareers.forEach((career) => {
    const requirements = [
      ...(career.essentialSkills || []).map((item) => ({ ...item, importance: "essential" })),
      ...(career.desirableSkills || []).map((item) => ({ ...item, importance: "desirable" })),
    ];
    requirements.forEach((requirement) => {
      const skillId = String(requirement.skillId);
      const record = studentBySkill.get(skillId);
      const required = PROFICIENCY_VALUES[requirement.requiredProficiency] || 1;
      const current = PROFICIENCY_VALUES[record?.proficiency] || 0;
      if (current >= required) return;
      const skill = skillById.get(skillId);
      const reason = `${requirement.importance === "essential" ? "Essential" : "Desirable"} ${skill?.name || "skill"} requirement for ${career.title}`;
      addTarget(targets, skillId, { priority: requirement.importance === "essential" ? 90 : 60, reason, career: career.title });
      (skill?.prerequisites || []).forEach((prerequisiteId) => {
        const prerequisiteRecord = studentBySkill.get(String(prerequisiteId));
        if (prerequisiteRecord) return;
        addTarget(targets, prerequisiteId, {
          priority: 120,
          reason: `Foundational prerequisite for ${skill.name}`,
          career: career.title,
          prerequisiteFor: skill.name,
        });
      });
    });
  });

  context.studentSkills.forEach((record) => {
    if (["practicing", "proficient"].includes(record.learningStatus)) return;
    const skill = skillById.get(String(record.skillId));
    if (!skill) return;
    addTarget(targets, skill._id, { priority: 45, reason: `${skill.name} is currently tracked as a learning goal` });
    (skill.prerequisites || []).forEach((prerequisiteId) => {
      if (studentBySkill.has(String(prerequisiteId))) return;
      addTarget(targets, prerequisiteId, { priority: 100, reason: `Prerequisite for the tracked ${skill.name} learning goal`, prerequisiteFor: skill.name });
    });
  });
  return { targets, skillById, targetCareers };
}

async function recommendLearningResources(userId, { limit = 12 } = {}) {
  const context = await loadRecommendationContext(userId);
  const { targets, skillById, targetCareers } = buildLearningTargets(context);
  const stateByResource = new Map(context.learningStates.map((item) => [String(item.resourceId), item]));
  const completedIds = new Set(context.learningStates.filter((item) => item.status === "completed").map((item) => String(item.resourceId)));
  const recommendations = context.resources.map((resource) => {
    if (completedIds.has(String(resource._id))) return null;
    const matches = (resource.skillsCovered || []).map((skill) => {
      const target = targets.get(String(skill._id));
      return target ? { skill, target } : null;
    }).filter(Boolean);
    if (!matches.length) return null;
    const priority = Math.max(...matches.map((item) => item.target.priority)) + Math.min(15, (matches.length - 1) * 5);
    const prerequisiteFirst = matches.some((item) => item.target.prerequisiteFor.size > 0);
    return {
      resource: presentResource(resource, presentStudentState(stateByResource.get(String(resource._id)))),
      priority,
      priorityType: prerequisiteFirst ? "prerequisite_first" : "goal_alignment",
      reasons: [...new Set(matches.flatMap((item) => [...item.target.reasons]))].slice(0, 5),
      addressedSkills: matches.map((item) => ({
        id: String(item.skill._id),
        name: item.skill.name,
        prerequisiteFor: [...item.target.prerequisiteFor],
      })),
      relatedCareers: [...new Set(matches.flatMap((item) => [...item.target.careers]))],
    };
  }).filter(Boolean).sort((a, b) => b.priority - a.priority || a.resource.title.localeCompare(b.resource.title)).slice(0, limit);

  return {
    items: recommendations,
    context: {
      targetCareerCount: targetCareers.length,
      targetSkillCount: targets.size,
      targetSkills: [...targets.keys()].map((id) => ({ id, name: skillById.get(id)?.name || "Skill" })),
    },
    explanation: recommendations.length
      ? "Recommendations match recorded learning goals, active career requirements, comparison selections, or their prerequisites. Foundational prerequisites are prioritized."
      : "No directly relevant active resource is currently available for the recorded learning and career goals.",
  };
}

module.exports = {
  buildLearningTargets,
  careerMatchesInterests,
  loadRecommendationContext,
  profileInterestSignals,
  recommendLearningResources,
};
