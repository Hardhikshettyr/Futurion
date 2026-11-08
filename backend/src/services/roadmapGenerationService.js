const mongoose = require("mongoose");
const Career = require("../models/Career");
const LearningResource = require("../models/LearningResource");
const Skill = require("../models/Skill");
const StudentProfile = require("../models/StudentProfile");
const StudentSkill = require("../models/StudentSkill");
const AppError = require("../utils/AppError");
const { PROFICIENCY_VALUES } = require("../utils/skillTaxonomy");
const { textMatch } = require("./careerRecommendationService");

const STAGE_DEFINITIONS = Object.freeze([
  { stageKey: "foundations", title: "Build foundations", description: "Complete the prerequisites that support later career skills.", displayOrder: 0 },
  { stageKey: "core_skills", title: "Develop core skills", description: "Work toward the essential skills recorded for this career.", displayOrder: 1 },
  { stageKey: "advanced_skills", title: "Strengthen advanced skills", description: "Develop useful desirable skills after the core foundation is in place.", displayOrder: 2 },
  { stageKey: "application", title: "Apply and demonstrate", description: "Turn learning into evidence and investigate recorded certification requirements.", displayOrder: 3 },
]);

const DIFFICULTY_HOURS = Object.freeze({ foundational: 6, intermediate: 10, advanced: 14 });

function idOf(value) {
  return String(value?._id || value);
}

function maxProficiency(left, right) {
  return (PROFICIENCY_VALUES[left] || 0) >= (PROFICIENCY_VALUES[right] || 0) ? left : right;
}

function requirementKey(skillId, targetProficiency) {
  return `skill:${skillId}:target:${targetProficiency}`;
}

function evidenceIsDemonstrated(record) {
  return ["demonstrated", "verified"].includes(record?.evidenceStatus);
}

function requirementNeedsTask(record, targetProficiency) {
  const current = PROFICIENCY_VALUES[record?.proficiency] || 0;
  const target = PROFICIENCY_VALUES[targetProficiency] || 1;
  if (current < target) return "skill_development";
  if (!evidenceIsDemonstrated(record)) return "skill_evidence";
  return null;
}

function activePrerequisiteRules(skill, targetProficiency) {
  const rules = skill.prerequisiteRules || [];
  if (rules.length) return rules.filter((rule) => {
    const levels = rule.requiredForLevels || [];
    return levels.length === 0 || levels.includes(targetProficiency);
  });
  return (skill.prerequisites || []).map((skillId) => ({
    skillId,
    importance: "essential",
    minimumProficiency: "beginner",
    requiredForLevels: [],
  }));
}

function addRequirement(requirements, skillId, values) {
  const id = idOf(skillId);
  const current = requirements.get(id);
  if (!current) {
    requirements.set(id, { skillId: id, ...values, reasons: new Set(values.reasons || []) });
    return true;
  }
  const previousTarget = current.targetProficiency;
  current.targetProficiency = maxProficiency(current.targetProficiency, values.targetProficiency);
  current.required = current.required || values.required;
  current.priority = Math.min(current.priority, values.priority);
  const kindPriority = { prerequisite: 0, essential: 1, desirable: 2 };
  current.kind = kindPriority[values.kind] < kindPriority[current.kind] ? values.kind : current.kind;
  (values.reasons || []).forEach((reason) => current.reasons.add(reason));
  return current.targetProficiency !== previousTarget;
}

function buildRequirements(career, skillById) {
  const requirements = new Map();
  (career.essentialSkills || []).forEach((item) => addRequirement(requirements, item.skillId, {
    targetProficiency: item.requiredProficiency,
    kind: "essential",
    required: true,
    priority: 1,
    reasons: [item.rationale || `Essential for ${career.title}`],
  }));
  (career.desirableSkills || []).forEach((item) => addRequirement(requirements, item.skillId, {
    targetProficiency: item.requiredProficiency,
    kind: "desirable",
    required: false,
    priority: 2,
    reasons: [item.rationale || `Desirable for ${career.title}`],
  }));

  const visit = (skillId, targetProficiency, ancestry = new Set()) => {
    const id = idOf(skillId);
    if (ancestry.has(id)) return;
    const skill = skillById.get(id);
    if (!skill) return;
    const nextAncestry = new Set(ancestry).add(id);
    activePrerequisiteRules(skill, targetProficiency).forEach((rule) => {
      const prerequisiteId = idOf(rule.skillId);
      const changed = addRequirement(requirements, prerequisiteId, {
        targetProficiency: rule.minimumProficiency || "beginner",
        kind: "prerequisite",
        required: rule.importance !== "recommended",
        priority: 0,
        reasons: [`Prerequisite for ${skill.name}`],
      });
      const prerequisite = requirements.get(prerequisiteId);
      if (changed || !nextAncestry.has(prerequisiteId)) {
        visit(prerequisiteId, prerequisite.targetProficiency, nextAncestry);
      }
    });
  };
  [...requirements.values()].forEach((item) => visit(item.skillId, item.targetProficiency));
  return requirements;
}

function resourcesForSkill(resources, skillId) {
  return resources
    .filter((resource) => (resource.skillsCovered || []).some((covered) => idOf(covered) === skillId))
    .sort((left, right) => {
      const freeOrder = Number(right.priceType === "free") - Number(left.priceType === "free");
      return freeOrder || left.title.localeCompare(right.title);
    })
    .slice(0, 3)
    .map((resource) => resource._id);
}

function taskHours(skill, record, targetProficiency, taskType) {
  if (taskType === "skill_evidence") return 4;
  const current = PROFICIENCY_VALUES[record?.proficiency] || 0;
  const gap = Math.max(1, (PROFICIENCY_VALUES[targetProficiency] || 1) - current);
  return Math.min(60, (DIFFICULTY_HOURS[skill.difficultyLevel] || 8) * gap);
}

function studentHasRelevantProject(profile, career, requirementSkills) {
  const targets = [
    career.title,
    career.industry,
    ...(career.tags || []),
    ...requirementSkills.map((skill) => skill.name),
  ].filter(Boolean);
  return (profile?.projects || []).some((project) => [
    project.title,
    project.description,
    project.category,
    ...(project.technologies || []),
  ].filter(Boolean).some((value) => targets.some((target) => textMatch(value, target))));
}

function studentHasCertification(profile, certification) {
  return (profile?.certifications || []).some((item) => textMatch(item.name, certification.name));
}

function buildTaskTemplates({ career, profile, studentSkills, skills, resources }) {
  const skillById = new Map(skills.map((skill) => [idOf(skill), skill]));
  const studentBySkill = new Map(studentSkills.map((item) => [idOf(item.skillId), item]));
  const requirements = buildRequirements(career, skillById);
  const taskBySkill = new Map();
  const tasks = [];

  [...requirements.values()]
    .sort((left, right) => left.priority - right.priority || (skillById.get(left.skillId)?.name || "").localeCompare(skillById.get(right.skillId)?.name || ""))
    .forEach((requirement) => {
      const skill = skillById.get(requirement.skillId);
      if (!skill) return;
      const record = studentBySkill.get(requirement.skillId);
      const taskType = requirementNeedsTask(record, requirement.targetProficiency);
      if (!taskType) return;
      const stableKey = requirementKey(requirement.skillId, requirement.targetProficiency);
      const current = record?.proficiency;
      const stageKey = requirement.kind === "prerequisite"
        ? "foundations"
        : requirement.kind === "essential" ? "core_skills" : "advanced_skills";
      const description = taskType === "skill_evidence"
        ? `Create or record practical evidence for ${skill.name}. Your recorded proficiency meets the target, but it is not yet demonstrated or verified.`
        : `${current ? `Strengthen ${skill.name} from ${current}` : `Develop ${skill.name}`} toward ${requirement.targetProficiency} for ${career.title}.`;
      const task = {
        stableKey,
        taskType,
        stageKey,
        title: taskType === "skill_evidence" ? `Demonstrate ${skill.name}` : `${current ? "Strengthen" : "Learn"} ${skill.name}`,
        description,
        relatedSkillIds: [skill._id],
        prerequisiteSkillIds: activePrerequisiteRules(skill, requirement.targetProficiency).map((rule) => rule.skillId),
        dependsOnStableKeys: [],
        linkedResourceIds: resourcesForSkill(resources, requirement.skillId),
        targetProficiency: requirement.targetProficiency,
        estimatedHours: taskHours(skill, record, requirement.targetProficiency, taskType),
        required: requirement.required,
      };
      taskBySkill.set(requirement.skillId, task);
      tasks.push(task);
    });

  tasks.forEach((task) => {
    task.dependsOnStableKeys = task.prerequisiteSkillIds
      .map((skillId) => taskBySkill.get(idOf(skillId))?.stableKey)
      .filter(Boolean);
  });

  const requirementSkills = [...requirements.keys()].map((id) => skillById.get(id)).filter(Boolean);
  const essentialDependencies = (career.essentialSkills || [])
    .map((item) => taskBySkill.get(idOf(item.skillId))?.stableKey)
    .filter(Boolean);
  if (tasks.length && !studentHasRelevantProject(profile, career, requirementSkills)) {
    tasks.push({
      stableKey: `career:${idOf(career)}:portfolio-application`,
      taskType: "portfolio_application",
      stageKey: "application",
      title: `Apply skills in a ${career.title} project`,
      description: `Plan and complete a scoped project that applies the recorded skills for ${career.title}. This task creates evidence; it does not guarantee proficiency or employment outcomes.`,
      relatedSkillIds: (career.essentialSkills || []).map((item) => item.skillId),
      prerequisiteSkillIds: [],
      dependsOnStableKeys: essentialDependencies,
      linkedResourceIds: [],
      targetProficiency: "",
      estimatedHours: 12,
      required: true,
    });
  }

  (career.requiredCertifications || []).forEach((certification, index) => {
    if (studentHasCertification(profile, certification)) return;
    tasks.push({
      stableKey: `career:${idOf(career)}:required-certification:${index}`,
      taskType: "certification_preparation",
      stageKey: "application",
      title: `Investigate ${certification.name}`,
      description: `Review the recorded ${certification.name} requirement${certification.issuer ? ` from ${certification.issuer}` : ""}, confirm current eligibility and assessment details with the issuer, and plan preparation.`,
      relatedSkillIds: [],
      prerequisiteSkillIds: [],
      dependsOnStableKeys: essentialDependencies,
      linkedResourceIds: [],
      targetProficiency: "",
      estimatedHours: 4,
      required: true,
    });
  });
  return tasks;
}

function orderTemplates(templates) {
  const remaining = new Map(templates.map((task) => [task.stableKey, task]));
  const ordered = [];
  while (remaining.size) {
    const ready = [...remaining.values()].filter((task) => task.dependsOnStableKeys.every((key) => !remaining.has(key)));
    const candidates = ready.length ? ready : [[...remaining.values()].sort((a, b) => a.stableKey.localeCompare(b.stableKey))[0]];
    candidates.sort((a, b) => {
      const stageA = STAGE_DEFINITIONS.find((stage) => stage.stageKey === a.stageKey)?.displayOrder || 0;
      const stageB = STAGE_DEFINITIONS.find((stage) => stage.stageKey === b.stageKey)?.displayOrder || 0;
      return stageA - stageB || a.title.localeCompare(b.title);
    }).forEach((task) => {
      if (!remaining.has(task.stableKey)) return;
      ordered.push(task);
      remaining.delete(task.stableKey);
    });
  }
  return ordered;
}

function materializeStages(templates, { createdFrom = "initial" } = {}) {
  const ordered = orderTemplates(templates);
  const idByKey = new Map(ordered.map((task) => [task.stableKey, new mongoose.Types.ObjectId()]));
  return STAGE_DEFINITIONS.map((stage) => ({
    ...stage,
    tasks: ordered.filter((task) => task.stageKey === stage.stageKey).map((task, index) => ({
      _id: idByKey.get(task.stableKey),
      stableKey: task.stableKey,
      taskType: task.taskType,
      title: task.title,
      description: task.description,
      relatedSkillIds: task.relatedSkillIds,
      prerequisiteSkillIds: task.prerequisiteSkillIds,
      dependsOnTaskIds: task.dependsOnStableKeys.map((key) => idByKey.get(key)).filter(Boolean),
      linkedResourceIds: task.linkedResourceIds,
      targetProficiency: task.targetProficiency,
      estimatedHours: task.estimatedHours,
      required: task.required,
      displayOrder: index,
      createdFrom,
    })),
  }));
}

async function generateRoadmapPlan(userId, targetCareerId) {
  const [career, profile, studentSkills, skills, resources] = await Promise.all([
    Career.findOne({ _id: targetCareerId, status: "active" }).lean(),
    StudentProfile.findOne({ userId }).lean(),
    StudentSkill.find({ userId }).lean(),
    Skill.find({ status: "active" }).lean(),
    LearningResource.find({ status: "active" }).lean(),
  ]);
  if (!career) throw new AppError(404, "CAREER_NOT_FOUND", "The selected active career was not found");
  const templates = buildTaskTemplates({ career, profile, studentSkills, skills, resources });
  const requirementsCount = (career.essentialSkills || []).length + (career.desirableSkills || []).length + (career.requiredCertifications || []).length;
  const generationNotes = [];
  if (!requirementsCount) generationNotes.push("This roadmap is incomplete because the selected career has no structured skill or certification requirements yet.");
  if (!profile) generationNotes.push("No student profile was found, so existing projects and certifications could not be considered.");
  if (!templates.length && requirementsCount) generationNotes.push("No new tasks are required from the currently recorded skill, project, and certification evidence.");
  return {
    career,
    profile,
    templates,
    stages: materializeStages(templates),
    generationNotes,
    methodology: "Tasks are generated deterministically from active Career requirements, prerequisite rules, recorded Student Skills, project and certification evidence, and active Learning Resources. Completed learning resources alone are not treated as proof of skill.",
  };
}

module.exports = {
  STAGE_DEFINITIONS,
  activePrerequisiteRules,
  buildRequirements,
  buildTaskTemplates,
  generateRoadmapPlan,
  materializeStages,
  orderTemplates,
  requirementNeedsTask,
};
