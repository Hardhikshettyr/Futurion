const Skill = require("../models/Skill");
const StudentProfile = require("../models/StudentProfile");
const StudentSkill = require("../models/StudentSkill");
const AppError = require("../utils/AppError");
const {
  PROFICIENCY_VALUES,
  normalizeSkillIdentity,
} = require("../utils/skillTaxonomy");
const { getSkillDependencies, presentSkill } = require("./skillLibraryService");

function evidenceIsSufficient(status) {
  return ["demonstrated", "verified"].includes(status);
}

function prerequisiteRules(skill) {
  const configured = new Map(
    (skill.prerequisiteRules || []).map((rule) => [String(rule.skillId), rule]),
  );
  return (skill.prerequisites || []).map((skillId) => {
    const rule = configured.get(String(skillId)) || {};
    return {
      skillId: String(skillId),
      importance: rule.importance || "essential",
      minimumProficiency: rule.minimumProficiency || "beginner",
      requiredForLevels: rule.requiredForLevels || [],
    };
  });
}

function ruleAppliesAtLevel(rule, targetLevel) {
  return !rule.requiredForLevels.length || rule.requiredForLevels.includes(targetLevel);
}

function prerequisiteProgress(record, rule) {
  if (!record) return "missing";
  const current = PROFICIENCY_VALUES[record.proficiency] || 0;
  const required = PROFICIENCY_VALUES[rule.minimumProficiency] || 1;
  if (
    current >= required &&
    (["practicing", "proficient"].includes(record.learningStatus) || evidenceIsSufficient(record.evidenceStatus))
  ) {
    return "completed";
  }
  return "in_progress";
}

function actionForGap({ missing, belowRequired, insufficientEvidence, missingPrerequisites }) {
  if (missingPrerequisites.length) {
    return `Build the essential prerequisite${missingPrerequisites.length > 1 ? "s" : ""}: ${missingPrerequisites.map((skill) => skill.name).join(", ")}.`;
  }
  if (missing) return "Add this skill to your learning plan and begin with its foundational material.";
  if (belowRequired) return "Continue practicing toward the required level and attach evidence from work you own.";
  if (insufficientEvidence) return "Connect a relevant project, certification, experience, coursework item, or assessment.";
  return "Requirement met. Keep the skill current through continued practice.";
}

async function analyzeCompetency(userId, requirements) {
  const [skills, studentRecords] = await Promise.all([
    Skill.find({ status: "active" }).lean(),
    StudentSkill.find({ userId }).lean(),
  ]);
  const skillById = new Map(skills.map((skill) => [String(skill._id), skill]));
  const studentBySkill = new Map(
    studentRecords.map((record) => [String(record.skillId), record]),
  );
  const unknown = requirements.filter((requirement) => !skillById.has(requirement.skillId));
  if (unknown.length) {
    throw new AppError(400, "COMPETENCY_SKILL_INVALID", "Every required skill must exist and be active");
  }

  let earnedRatio = 0;
  const results = requirements.map((requirement) => {
    const skill = skillById.get(requirement.skillId);
    const studentSkill = studentBySkill.get(requirement.skillId);
    const requiredValue = PROFICIENCY_VALUES[requirement.requiredProficiency];
    const currentValue = studentSkill ? PROFICIENCY_VALUES[studentSkill.proficiency] : 0;
    earnedRatio += Math.min(currentValue, requiredValue) / requiredValue;

    const prerequisiteStatuses = prerequisiteRules(skill)
      .filter((rule) => ruleAppliesAtLevel(rule, requirement.requiredProficiency))
      .map((rule) => ({
        rule,
        skill: skillById.get(rule.skillId),
        status: prerequisiteProgress(studentBySkill.get(rule.skillId), rule),
      }))
      .filter((entry) => entry.skill);
    const missingPrerequisites = prerequisiteStatuses
      .filter((entry) => entry.rule.importance === "essential" && entry.status !== "completed")
      .map((entry) => ({
        ...presentSkill(entry.skill),
        progressStatus: entry.status,
        minimumProficiency: entry.rule.minimumProficiency,
      }));
    const recommendedPrerequisites = prerequisiteStatuses
      .filter((entry) => entry.rule.importance === "recommended" && entry.status !== "completed")
      .map((entry) => ({
        ...presentSkill(entry.skill),
        progressStatus: entry.status,
        minimumProficiency: entry.rule.minimumProficiency,
      }));
    const missing = !studentSkill;
    const belowRequired = !missing && currentValue < requiredValue;
    const insufficientEvidence = !missing && !evidenceIsSufficient(studentSkill.evidenceStatus);
    const meetsProficiency = !missing && currentValue >= requiredValue;
    return {
      skill: presentSkill(skill),
      requiredProficiency: requirement.requiredProficiency,
      currentProficiency: studentSkill?.proficiency || null,
      proficiencyGap: Math.max(0, requiredValue - currentValue),
      evidenceStatus: studentSkill?.evidenceStatus || null,
      missing,
      belowRequired,
      meetsProficiency,
      insufficientEvidence,
      prerequisitesMissing: missingPrerequisites.length > 0,
      missingPrerequisites,
      recommendedPrerequisites,
      recommendedNextAction: actionForGap({
        missing,
        belowRequired,
        insufficientEvidence,
        missingPrerequisites,
      }),
    };
  });

  const summary = {
    totalRequirements: results.length,
    missingSkills: results.filter((item) => item.missing).length,
    belowRequiredProficiency: results.filter((item) => item.belowRequired).length,
    meetingRequiredProficiency: results.filter((item) => item.meetsProficiency).length,
    insufficientEvidence: results.filter((item) => item.insufficientEvidence).length,
    incompletePrerequisites: results.filter((item) => item.prerequisitesMissing).length,
    proficiencyCoverage: Math.round((earnedRatio / results.length) * 100),
    calculation:
      "For each requirement, current proficiency is capped at the required level and divided by that required level. The displayed percentage is the average of those ratios. Evidence and prerequisites are reported separately and do not change this score.",
    disclaimer:
      "This is a transparent planning comparison, not an objective assessment, hiring probability, or employment prediction.",
  };
  return { summary, requirements: results };
}

function recommendationPriorityValue(priority) {
  return { high: 3, medium: 2, low: 1 }[priority] || 0;
}

function prerequisiteIsComplete(record, rule = { minimumProficiency: "beginner" }) {
  return prerequisiteProgress(record, {
    minimumProficiency: rule.minimumProficiency || "beginner",
  }) === "completed";
}

function interestSignals(profile) {
  const preferences = profile?.preferences || {};
  const education = profile?.education || [];
  return [
    ...(preferences.preferredRoles || []).map((value) => ({ value, source: "preferred role" })),
    ...(preferences.preferredIndustries || []).map((value) => ({ value, source: "preferred industry" })),
    ...(preferences.careerInterests || []).map((value) => ({ value, source: "career interest" })),
    ...(preferences.areasToExplore || []).map((value) => ({ value, source: "area to explore" })),
    ...education.flatMap((item) => [
      { value: item.academicDiscipline, source: "academic discipline" },
      { value: item.specialization, source: "specialization" },
      ...(item.relevantCoursework || []).map((value) => ({ value, source: "coursework" })),
    ]),
  ]
    .filter((signal) => signal.value)
    .map((signal) => ({ ...signal, normalized: normalizeSkillIdentity(signal.value) }))
    .filter((signal) => signal.normalized.length >= 3);
}

function evidenceSignals(profile) {
  return [
    ...(profile?.projects || []).flatMap((project) => [
      ...((project.technologies || []).map((value) => ({ value, source: `project “${project.title}”` }))),
      { value: project.category, source: `project “${project.title}”` },
    ]),
    ...(profile?.certifications || []).flatMap((certification) => [
      ...(certification.relatedSkills || []).map((value) => ({ value, source: `certification “${certification.name}”` })),
      { value: certification.name, source: `certification “${certification.name}”` },
    ]),
    ...(profile?.experience || []).flatMap((experience) =>
      (experience.skillsUsed || []).map((value) => ({ value, source: `experience at ${experience.organization}` })),
    ),
  ]
    .filter((signal) => signal.value)
    .map((signal) => ({ ...signal, normalized: normalizeSkillIdentity(signal.value) }));
}

function skillMatchesSignal(skill, signal) {
  const identities = [skill.name, ...(skill.aliases || [])].map(normalizeSkillIdentity);
  return identities.some((identity) =>
    identity === signal.normalized ||
    (identity.length >= 4 && signal.normalized.includes(identity)) ||
    (signal.normalized.length >= 4 && identity.includes(signal.normalized)),
  );
}

async function recommendSkills(userId) {
  const [skills, records, profile] = await Promise.all([
    Skill.find({ status: "active" }).sort({ name: 1 }).lean(),
    StudentSkill.find({ userId }).lean(),
    StudentProfile.findOne({ userId })
      .select("education preferences projects certifications experience")
      .lean(),
  ]);
  const skillById = new Map(skills.map((skill) => [String(skill._id), skill]));
  const studentBySkill = new Map(records.map((record) => [String(record.skillId), record]));
  const recommendations = new Map();

  function add({
    skill,
    type,
    priority,
    reason,
    nextSteps,
    relevantExistingSkills = [],
    missingPrerequisites = [],
    allowTracked = false,
    basis = [],
  }) {
    const tracked = studentBySkill.has(String(skill?._id));
    if (!skill || (tracked && !allowTracked)) return;
    const candidate = {
      skill: presentSkill(skill),
      recommendationType: type,
      priority,
      reason,
      nextSteps,
      basis,
      isTracked: tracked,
      relevantExistingSkills,
      missingPrerequisites,
    };
    const current = recommendations.get(String(skill._id));
    if (!current || recommendationPriorityValue(priority) > recommendationPriorityValue(current.priority)) {
      recommendations.set(String(skill._id), candidate);
    }
  }

  records.forEach((record) => {
    const ownedSkill = skillById.get(String(record.skillId));
    if (!ownedSkill) return;
    const rules = prerequisiteRules(ownedSkill);
    rules.forEach((rule) => {
      const prerequisite = skillById.get(rule.skillId);
      const progress = prerequisiteProgress(studentBySkill.get(rule.skillId), rule);
      if (!prerequisite || progress === "completed") return;
      add({
        skill: prerequisite,
        type: "missing_foundation",
        priority: rule.importance === "essential" ? "high" : "low",
        reason: `${prerequisite.name} is a ${rule.importance} prerequisite for ${ownedSkill.name}, which you recorded at ${record.proficiency} proficiency with ${record.learningStatus.replaceAll("_", " ")} learning status.`,
        nextSteps: progress === "missing"
          ? `Review ${prerequisite.name} and add it only if you decide to track it.`
          : `Continue ${prerequisite.name} until it reaches ${rule.minimumProficiency} proficiency and active practice.`,
        relevantExistingSkills: [presentSkill(ownedSkill)],
        basis: [`Curated ${rule.importance} prerequisite`, `Required level: ${rule.minimumProficiency}`],
      });
    });

    if (!evidenceIsSufficient(record.evidenceStatus)) {
      const evidenceCount = record.evidenceReferences?.length || 0;
      add({
        skill: ownedSkill,
        type: "evidence_gap",
        priority: ["advanced", "expert"].includes(record.proficiency) ? "high" : "medium",
        reason: `${ownedSkill.name} is recorded at ${record.proficiency} proficiency, but its evidence status is ${record.evidenceStatus.replaceAll("_", " ")} with ${evidenceCount} attached evidence item${evidenceCount === 1 ? "" : "s"}.`,
        nextSteps: "Attach an owned project, certification, experience, coursework item, or assessment that directly demonstrates this skill.",
        allowTracked: true,
        basis: [`Recorded proficiency: ${record.proficiency}`, `Evidence status: ${record.evidenceStatus}`],
      });
    }

    if (["advanced", "expert"].includes(record.proficiency)) {
      (ownedSkill.relatedSkills || []).forEach((id) => {
        const related = skillById.get(String(id));
        if (!related) return;
        const missing = prerequisiteRules(related)
          .filter((rule) => rule.importance === "essential" && !prerequisiteIsComplete(studentBySkill.get(rule.skillId), rule))
          .map((rule) => skillById.get(rule.skillId))
          .filter(Boolean)
          .map(presentSkill);
        add({
          skill: related,
          type: "related_strength",
          priority: missing.length ? "low" : "medium",
          reason: `${related.name} is explicitly related to your ${record.proficiency} ${ownedSkill.name} record${evidenceIsSufficient(record.evidenceStatus) ? " with supporting evidence" : ""}.`,
          nextSteps: missing.length
            ? `Address ${missing.map((item) => item.name).join(", ")} before treating it as the next step.`
            : `Review the ${related.name} description and decide whether it supports your goals.`,
          relevantExistingSkills: [presentSkill(ownedSkill)],
          missingPrerequisites: missing,
          basis: [`Curated relationship to ${ownedSkill.name}`],
        });
      });
    }
  });

  skills.forEach((skill) => {
    const rules = prerequisiteRules(skill).filter((rule) => rule.importance === "essential");
    if (!rules.length || studentBySkill.has(String(skill._id))) return;
    const completed = rules
      .filter((rule) => prerequisiteIsComplete(studentBySkill.get(rule.skillId), rule))
      .map((rule) => skillById.get(rule.skillId))
      .filter(Boolean);
    if (completed.length === rules.length) {
      add({
        skill,
        type: "next_skill",
        priority: "medium",
        reason: `You meet every essential curated prerequisite for ${skill.name}: ${completed.map((item) => item.name).join(", ")}.`,
        nextSteps: `Read the ${skill.name} scope and start with a small practical activity before recording proficiency.`,
        relevantExistingSkills: completed.map(presentSkill),
        basis: completed.map((item) => `Completed prerequisite: ${item.name}`),
      });
    }
  });

  const interests = interestSignals(profile);
  interests.forEach((signal) => {
    skills.filter((skill) => skillMatchesSignal(skill, signal)).forEach((skill) => {
      const missing = prerequisiteRules(skill)
        .filter((rule) => rule.importance === "essential" && !prerequisiteIsComplete(studentBySkill.get(rule.skillId), rule))
        .map((rule) => skillById.get(rule.skillId))
        .filter(Boolean)
        .map(presentSkill);
      add({
        skill,
        type: "declared_interest",
        priority: "medium",
        reason: `${skill.name} matches the ${signal.source} “${signal.value}” in your profile.`,
        nextSteps: missing.length
          ? `Begin with ${missing.map((item) => item.name).join(", ")}.`
          : `Compare ${skill.name} with your current goals and choose a practical starting activity.`,
        missingPrerequisites: missing,
        basis: [`Profile ${signal.source}: ${signal.value}`],
      });
    });
  });

  evidenceSignals(profile).forEach((signal) => {
    skills.filter((skill) => skillMatchesSignal(skill, signal)).forEach((skill) => {
      add({
        skill,
        type: "profile_evidence_candidate",
        priority: "medium",
        reason: `${signal.source} references ${signal.value}, which matches this canonical skill. Futurion has not added or verified it automatically.`,
        nextSteps: "Review the source record, then add the skill and attach that owned evidence only if the match is accurate.",
        basis: [`Owned profile source: ${signal.source}`],
      });
    });
  });

  if (!records.length && !recommendations.size) {
    const categories = new Set();
    skills.filter((skill) => skill.difficultyLevel === "foundational").forEach((skill) => {
      if (categories.size >= 6 || categories.has(skill.category)) return;
      categories.add(skill.category);
      add({
        skill,
        type: "foundation_exploration",
        priority: "low",
        reason: `${skill.name} is a foundational ${skill.category.replaceAll("_", " ")} skill. Your profile does not yet contain enough skill or interest data for a narrower recommendation.`,
        nextSteps: "Explore the skill description and add it only if it reflects something you want to learn.",
        basis: ["Limited profile context", `Foundational ${skill.category} category`],
      });
    });
  }

  const items = [...recommendations.values()]
    .sort((a, b) =>
      recommendationPriorityValue(b.priority) - recommendationPriorityValue(a.priority) ||
      a.skill.name.localeCompare(b.skill.name),
    )
    .slice(0, 20);
  return {
    items,
    methodology:
      "Recommendations use explicit prerequisite rules, recorded proficiency and learning status, evidence state, owned projects and certifications, and declared interests. They are deterministic suggestions, not verified competencies or career predictions.",
  };
}

function annotateDependencyTree(node, recordsBySkill) {
  if (!node) return null;
  return {
    ...node,
    isTracked: recordsBySkill.has(node.id),
    prerequisites: (node.prerequisites || []).map((child) =>
      annotateDependencyTree(child, recordsBySkill),
    ),
  };
}

function buildLearningSequence(tree, recordsBySkill) {
  const sequence = [];
  const visited = new Set();
  function visit(node) {
    if (!node || visited.has(node.id)) return;
    (node.prerequisites || []).forEach(visit);
    visited.add(node.id);
    const record = recordsBySkill.get(node.id);
    sequence.push({
      id: node.id,
      name: node.name,
      category: node.category,
      status: record ? "tracked" : "not_tracked",
      proficiency: record?.proficiency || null,
      learningStatus: record?.learningStatus || null,
    });
  }
  visit(tree);
  return sequence;
}

async function getStudentDependencyView(userId, skillId) {
  const [dependencies, records] = await Promise.all([
    getSkillDependencies(skillId),
    StudentSkill.find({ userId })
      .select("skillId proficiency learningStatus evidenceStatus")
      .lean(),
  ]);
  const recordsBySkill = new Map(records.map((record) => [String(record.skillId), record]));
  const ruleById = new Map(
    (dependencies.prerequisiteRules || []).map((rule) => [rule.skillId, rule]),
  );
  const directPrerequisites = dependencies.prerequisites.map((skill) => {
    const rule = ruleById.get(skill.id) || {
      importance: "essential",
      minimumProficiency: "beginner",
      requiredForLevels: [],
    };
    const studentProgress = recordsBySkill.get(skill.id);
    return {
      ...skill,
      relationship: rule,
      completionStatus: prerequisiteProgress(studentProgress, rule),
      studentProgress: studentProgress
        ? {
            proficiency: studentProgress.proficiency,
            learningStatus: studentProgress.learningStatus,
            evidenceStatus: studentProgress.evidenceStatus,
          }
        : null,
    };
  });
  const completedPrerequisites = directPrerequisites.filter((item) => item.completionStatus === "completed");
  const inProgressPrerequisites = directPrerequisites.filter((item) => item.completionStatus === "in_progress");
  const missingPrerequisites = directPrerequisites.filter((item) => item.completionStatus === "missing");
  const recommendedNextSkills = dependencies.dependents.filter((dependent) =>
    (dependent.prerequisiteRules || []).filter((rule) => rule.importance === "essential")
      .every((rule) => prerequisiteIsComplete(recordsBySkill.get(rule.skillId), rule)),
  );
  return {
    ...dependencies,
    tree: annotateDependencyTree(dependencies.tree, recordsBySkill),
    trackedSkillIds: [...recordsBySkill.keys()],
    directPrerequisites,
    completedPrerequisites,
    inProgressPrerequisites,
    missingPrerequisites,
    recommendedNextSkills,
    learningSequence: buildLearningSequence(dependencies.tree, recordsBySkill),
    prerequisiteInformationAvailable: directPrerequisites.length > 0,
    prerequisiteMessage: directPrerequisites.length
      ? "Direct prerequisites come from the curated Skill Library relationships."
      : "No prerequisite relationship has been configured for this skill.",
  };
}

module.exports = {
  actionForGap,
  analyzeCompetency,
  evidenceIsSufficient,
  getStudentDependencyView,
  prerequisiteIsComplete,
  prerequisiteProgress,
  prerequisiteRules,
  recommendSkills,
  ruleAppliesAtLevel,
};
