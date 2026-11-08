const Career = require("../models/Career");
const Skill = require("../models/Skill");
const StudentProfile = require("../models/StudentProfile");
const StudentSkill = require("../models/StudentSkill");
const AppError = require("../utils/AppError");
const { PROFICIENCY_VALUES } = require("../utils/skillTaxonomy");
const { analyzeCareer, CAREER_SCORE_WEIGHTS, textMatch } = require("./careerRecommendationService");
const { presentCareer } = require("./careerLibraryService");

const MAX_DECISION_ITEMS = 4;

function uniqueIds(values) {
  return [...new Set(values.map(String))];
}

function skillSummary(skill) {
  return {
    id: String(skill._id),
    name: skill.name,
    slug: skill.slug,
    category: skill.category,
    difficultyLevel: skill.difficultyLevel,
  };
}

function hydrateCareer(career, skillById) {
  return {
    ...career,
    essentialSkills: (career.essentialSkills || []).map((item) => ({
      ...item,
      skillId: skillById.get(String(item.skillId)) || item.skillId,
    })),
    desirableSkills: (career.desirableSkills || []).map((item) => ({
      ...item,
      skillId: skillById.get(String(item.skillId)) || item.skillId,
    })),
    crossDisciplinePathways: (career.crossDisciplinePathways || []).map((pathway) => ({
      ...pathway,
      additionalSkills: (pathway.additionalSkills || []).map((skillId) => skillById.get(String(skillId)) || skillId),
    })),
  };
}

function hydrateStudentSkills(records, skillById) {
  return records.filter((record) => skillById.has(String(record.skillId))).map((record) => ({
    ...record,
    skillId: skillById.get(String(record.skillId)),
    scenarioSource: "actual_profile",
  }));
}

async function loadDecisionContext(userId, careerIds) {
  const ids = uniqueIds(careerIds);
  const [profile, rawStudentSkills, skills, rawCareers] = await Promise.all([
    StudentProfile.findOne({ userId }).lean(),
    StudentSkill.find({ userId }).lean(),
    Skill.find({ status: "active" }).lean(),
    Career.find({ _id: { $in: ids }, status: "active" }).lean(),
  ]);
  if (rawCareers.length !== ids.length) {
    throw new AppError(400, "DECISION_CAREER_INVALID", "Every selected career must exist and be active");
  }
  const skillById = new Map(skills.map((skill) => [String(skill._id), skill]));
  const careerById = new Map(rawCareers.map((career) => [String(career._id), hydrateCareer(career, skillById)]));
  const invalidSkillReference = [...careerById.values()].some((career) =>
    [...career.essentialSkills, ...career.desirableSkills].some((item) => !item.skillId?.name),
  );
  if (invalidSkillReference) {
    throw new AppError(409, "DECISION_SKILL_REFERENCE_INVALID", "A selected career references a Skill Library entry that is no longer active");
  }
  return {
    profile,
    skills,
    skillById,
    studentSkills: hydrateStudentSkills(rawStudentSkills, skillById),
    careers: ids.map((id) => careerById.get(id)),
  };
}

function ruleForPrerequisite(skill, prerequisiteId) {
  const configured = (skill.prerequisiteRules || []).find((rule) => String(rule.skillId) === String(prerequisiteId));
  return {
    importance: configured?.importance || "essential",
    minimumProficiency: configured?.minimumProficiency || "beginner",
    requiredForLevels: configured?.requiredForLevels || [],
  };
}

function prerequisiteStatus(record, rule) {
  if (!record) return "missing";
  const proficiencyMet = (PROFICIENCY_VALUES[record.proficiency] || 0) >= (PROFICIENCY_VALUES[rule.minimumProficiency] || 1);
  if (record.scenarioSource !== "actual_profile") return proficiencyMet ? "hypothetical" : "in_progress";
  const supported = ["demonstrated", "verified"].includes(record.evidenceStatus)
    || ["practicing", "proficient"].includes(record.learningStatus);
  return proficiencyMet && supported ? "completed" : "in_progress";
}

function competencyDetails(career, studentSkills, skillById, { skillDataAvailable = studentSkills.length > 0 } = {}) {
  const studentBySkill = new Map(studentSkills.map((record) => [String(record.skillId._id), record]));
  const requirements = [
    ...(career.essentialSkills || []).map((item) => ({ ...item, importance: "essential" })),
    ...(career.desirableSkills || []).map((item) => ({ ...item, importance: "desirable" })),
  ];
  return requirements.map((requirement) => {
    const skill = requirement.skillId;
    const record = studentBySkill.get(String(skill._id));
    const requiredValue = PROFICIENCY_VALUES[requirement.requiredProficiency] || 1;
    const currentValue = PROFICIENCY_VALUES[record?.proficiency] || 0;
    const prerequisites = (skill.prerequisites || []).map((prerequisiteId) => {
      const prerequisite = skillById.get(String(prerequisiteId));
      const rule = ruleForPrerequisite(skill, prerequisiteId);
      if (!prerequisite || (rule.requiredForLevels.length && !rule.requiredForLevels.includes(requirement.requiredProficiency))) return null;
      const prerequisiteRecord = studentBySkill.get(String(prerequisiteId));
      return {
        skill: skillSummary(prerequisite),
        importance: rule.importance,
        minimumProficiency: rule.minimumProficiency,
        status: skillDataAvailable ? prerequisiteStatus(prerequisiteRecord, rule) : "unknown",
        currentProficiency: prerequisiteRecord?.proficiency || null,
        source: prerequisiteRecord?.scenarioSource || null,
      };
    }).filter(Boolean);
    const evidenceAvailable = Boolean(record && (
      ["demonstrated", "verified"].includes(record.evidenceStatus)
      || (record.evidenceReferences || []).length
    ));
    return {
      skill: skillSummary(skill),
      importance: requirement.importance,
      requiredProficiency: requirement.requiredProficiency,
      currentProficiency: record?.proficiency || null,
      proficiencyGap: skillDataAvailable ? Math.max(0, requiredValue - currentValue) : null,
      meetsProficiency: Boolean(record && currentValue >= requiredValue),
      assessmentStatus: record ? "recorded" : skillDataAvailable ? "not_recorded" : "unknown",
      source: record?.scenarioSource || null,
      hypothetical: Boolean(record && record.scenarioSource !== "actual_profile"),
      evidenceStatus: record?.evidenceStatus || null,
      evidenceAvailable,
      missingPrerequisites: skillDataAvailable
        ? prerequisites.filter((item) => item.importance === "essential" && item.status !== "completed")
        : [],
      recommendedPrerequisites: skillDataAvailable
        ? prerequisites.filter((item) => item.importance === "recommended" && item.status !== "completed")
        : [],
      unassessedPrerequisites: skillDataAvailable ? [] : prerequisites,
      rationale: requirement.rationale || "",
    };
  });
}

function certificationComparison(career, profile) {
  const held = profile?.certifications || [];
  const present = (certification, requirementType) => {
    const match = held.find((item) => textMatch(item.name, certification.name));
    return {
      name: certification.name,
      issuer: certification.issuer || "",
      description: certification.description || "",
      requirementType,
      alreadyHeld: Boolean(match),
      heldCertification: match ? { id: String(match._id), name: match.name, issuer: match.issuer } : null,
      externalUrl: certification.linkVerified ? certification.externalUrl || "" : "",
      linkVerified: Boolean(certification.linkVerified && certification.externalUrl),
    };
  };
  const required = (career.requiredCertifications || []).map((item) => present(item, "required_where_applicable"));
  const recommended = (career.recommendedCertifications || []).map((item) => present(item, "recommended"));
  const careerSkillNames = [...career.essentialSkills, ...career.desirableSkills].map((item) => item.skillId.name);
  const relevantHeld = held.filter((item) =>
    [...(item.relatedSkills || []), item.name].some((value) => careerSkillNames.some((name) => textMatch(value, name))),
  ).map((item) => ({ id: String(item._id), name: item.name, issuer: item.issuer }));
  return {
    required,
    recommended,
    relevantHeld,
    additionalUseful: recommended.filter((item) => !item.alreadyHeld),
    explanation: "Required and recommended labels come from the Career Library. Recommended certifications are not treated as mandatory.",
  };
}

function profileApplicationAlignment(career, profile, fit) {
  const relevantInternships = fit.relevantExperience.filter((item) => item.experienceType === "internship");
  const relevantCertifications = certificationComparison(career, profile).relevantHeld;
  const portfolioGaps = [];
  if (!fit.relevantProjects.length) portfolioGaps.push("No recorded project directly aligns with this career yet.");
  if (!fit.relevantExperience.length) portfolioGaps.push("No directly aligned experience is currently recorded in the profile.");
  if (!relevantCertifications.length && (career.requiredCertifications.length || career.recommendedCertifications.length)) {
    portfolioGaps.push("No recorded certification matches the certifications listed for this career.");
  }
  const suggestedProjectAreas = fit.missingSkills.slice(0, 4).map((item) => ({
    focusSkill: item.skill,
    suggestion: `Create a scoped project that demonstrates ${item.skill.name} and document your decisions, evidence, and outcome.`,
    basis: `Career Library ${item.importance} skill gap`,
  }));
  return {
    relevantProjects: fit.relevantProjects,
    relevantExperience: fit.relevantExperience,
    relevantInternships,
    relevantCertifications,
    portfolioGaps,
    suggestedProjectAreas,
  };
}

function preparationRequirements(career, fit, competencies, skillById, { skillDataAvailable = true } = {}) {
  const educationDataAvailable = Boolean(fit.contributions.find((item) => item.factor === "education")?.available);
  const missingRequirements = competencies.filter((item) => !item.currentProficiency);
  const missingFoundations = skillDataAvailable ? missingRequirements.filter((item) => skillById.get(item.skill.id)?.difficultyLevel === "foundational") : [];
  const missingAdvancedCompetencies = skillDataAvailable ? competencies.filter((item) =>
    (!item.currentProficiency || item.proficiencyGap > 0)
      && (["advanced", "expert"].includes(item.requiredProficiency)
        || skillById.get(item.skill.id)?.difficultyLevel === "advanced"),
  ) : [];
  const missingPrerequisites = skillDataAvailable ? [...new Map(
    competencies.flatMap((item) => item.missingPrerequisites).map((item) => [item.skill.id, item]),
  ).values()] : [];
  const evidenceGaps = competencies.filter((item) => item.currentProficiency && !item.evidenceAvailable).map((item) => ({
    skill: item.skill,
    evidenceStatus: item.evidenceStatus,
    message: item.hypothetical
      ? "This proficiency exists only in the scenario and has no actual evidence."
      : "The recorded proficiency does not yet have demonstrated or verified evidence.",
  }));
  const additionalQualifications = (career.requiredEducation || []).map((item) => ({
    qualification: item.qualification,
    pathwayType: item.pathwayType,
    description: item.description,
    matchedByCurrentEducation: educationDataAvailable
      ? (fit.educationAlignment.matchingEducation || []).length > 0
      : null,
  }));
  const priorities = [
    ...missingPrerequisites.slice(0, 3).map((item) => `Review the ${item.skill.name} prerequisite and its ${item.minimumProficiency} target.`),
    ...fit.missingSkills.filter((item) => item.importance === "essential").slice(0, 4).map((item) => `Develop ${item.skill.name} toward ${item.requiredProficiency}.`),
    ...fit.skillsRequiringImprovement.slice(0, 3).map((item) => `Strengthen ${item.skill.name} from ${item.currentProficiency} toward ${item.requiredProficiency}.`),
    ...evidenceGaps.slice(0, 2).map((item) => `Create or connect owned evidence for ${item.skill.name}.`),
  ];
  return {
    missingFoundations,
    missingAdvancedCompetencies,
    missingPrerequisites,
    unassessedRequirements: skillDataAvailable ? [] : competencies,
    evidenceGaps,
    additionalQualifications,
    practicalProjectRequirements: fit.missingSkills.slice(0, 4).map((item) => `Demonstrate ${item.skill.name} in a scoped, reviewable project.`),
    learningResources: (career.learningResources || []).filter((item) => item.verified && item.url).map((item) => ({ title: item.title, provider: item.provider, url: item.url, description: item.description })),
    priorities,
  };
}

function strengthsAndTradeoffs(career, fit, application, preparation) {
  const skillFactor = fit.contributions.find((item) => item.factor === "skills");
  const educationFactor = fit.contributions.find((item) => item.factor === "education");
  const strengths = [
    ...fit.matchingSkills.slice(0, 4).map((item) => `${item.skill.name} meets the listed ${item.requiredProficiency} proficiency.`),
    ...application.relevantProjects.slice(0, 2).map((item) => `Recorded project: ${item.title}.`),
    ...(fit.educationAlignment.matchingEducation || []).slice(0, 2).map((item) => `Education aligns with the ${item.name} pathway.`),
  ];
  const tradeoffs = [];
  if (fit.missingSkills.length) tradeoffs.push(`${fit.missingSkills.length} listed skill${fit.missingSkills.length === 1 ? " is" : "s are"} not recorded in the current starting point.`);
  if (fit.skillsRequiringImprovement.length) tradeoffs.push(`${fit.skillsRequiringImprovement.length} skill${fit.skillsRequiringImprovement.length === 1 ? " needs" : "s need"} higher proficiency.`);
  if (preparation.missingPrerequisites.length) tradeoffs.push(`${preparation.missingPrerequisites.length} essential prerequisite${preparation.missingPrerequisites.length === 1 ? " requires" : "s require"} attention.`);
  if (!skillFactor?.available) tradeoffs.push("Skill alignment is unknown because no student skill records are available.");
  if (!educationFactor?.available) tradeoffs.push("Education alignment is unknown because no education record is available.");
  else if (!(fit.educationAlignment.matchingEducation || []).length) tradeoffs.push("No direct education-discipline match was found; investigate common and alternative pathways.");
  if (!career.learningResources?.some((item) => item.verified && item.url)) tradeoffs.push("The library currently has no verified learning-resource link for this career.");
  return {
    strengths: strengths.length ? strengths : ["No strong profile match can be stated from the currently available data."],
    tradeoffs: tradeoffs.length ? tradeoffs : ["No major preparation difference was identified from the available profile data; verify role-specific requirements independently."],
  };
}

function buildCareerDecisionAnalysis(career, profile, studentSkills, skillById) {
  const fit = analyzeCareer(career, profile, studentSkills);
  const skillFactor = fit.contributions.find((item) => item.factor === "skills");
  const skillDataAvailable = Boolean(skillFactor?.available);
  if (!skillDataAvailable) {
    fit.unassessedSkills = fit.missingSkills;
    fit.missingSkills = [];
    fit.skillDataState = "unknown";
  } else {
    fit.unassessedSkills = [];
    fit.skillDataState = "available";
  }
  const competencies = competencyDetails(career, studentSkills, skillById, { skillDataAvailable });
  const certifications = certificationComparison(career, profile);
  const application = profileApplicationAlignment(career, profile, fit);
  const preparation = preparationRequirements(career, fit, competencies, skillById, { skillDataAvailable });
  return {
    career: presentCareer(career, { detail: true }),
    alignment: fit,
    competencies,
    certifications,
    application,
    preparation,
    ...strengthsAndTradeoffs(career, fit, application, preparation),
  };
}

function dataAvailability(profile, studentSkills) {
  return {
    education: Boolean(profile?.education?.length),
    skills: Boolean(studentSkills.length),
    projects: Boolean(profile?.projects?.length),
    experience: Boolean(profile?.experience?.length),
    certifications: Boolean(profile?.certifications?.length),
    interests: Boolean(profile?.preferences && [
      ...(profile.preferences.careerInterests || []),
      ...(profile.preferences.preferredRoles || []),
      ...(profile.preferences.preferredIndustries || []),
    ].length),
  };
}

function extremeIds(analyses, value, direction, idFor = (item) => item.career.id) {
  const values = analyses.map((item) => ({ id: idFor(item), value: value(item) }));
  const target = direction === "max" ? Math.max(...values.map((item) => item.value)) : Math.min(...values.map((item) => item.value));
  return values.filter((item) => item.value === target).map((item) => item.id);
}

function comparisonSignals(analyses) {
  return {
    mostCurrentSkillMatches: extremeIds(analyses, (item) => item.alignment.matchingSkills.length, "max"),
    mostProfileEvidence: extremeIds(analyses, (item) => item.application.relevantProjects.length + item.application.relevantExperience.length, "max"),
    fewestOutstandingSkillItems: extremeIds(analyses, (item) => item.alignment.missingSkills.length + item.alignment.skillsRequiringImprovement.length, "min"),
    largestPreparationSet: extremeIds(analyses, (item) => item.preparation.priorities.length, "max"),
    explanation: "These signals compare counts in the current profile and library records. They do not identify a universally better career.",
  };
}

async function analyzeCareerComparison(userId, careerIds) {
  const context = await loadDecisionContext(userId, careerIds);
  const analyses = context.careers.map((career) => buildCareerDecisionAnalysis(career, context.profile, context.studentSkills, context.skillById));
  return {
    weights: CAREER_SCORE_WEIGHTS,
    methodology: "Each career is independently compared with the authenticated student's current profile. Available factors use the documented Module 3 weights; missing profile factors are excluded from the denominator. Scores are planning alignment indicators, not employment probabilities.",
    dataAvailability: dataAvailability(context.profile, context.studentSkills),
    careers: analyses,
    signals: comparisonSignals(analyses),
    disclaimer: "Use this workspace to inspect differences and assumptions. It does not determine eligibility, admission, hiring, salary, demand, or the right career for a student.",
  };
}

function scenarioEffectiveContext(scenario, context) {
  const actualBySkill = new Map(context.studentSkills.map((item) => [String(item.skillId._id), item]));
  const effectiveBySkill = scenario.startingPointType === "existing_profile"
    ? new Map(context.studentSkills.map((item) => [String(item.skillId._id), { ...item }]))
    : new Map();
  const hypotheticalInputs = [];
  for (const override of scenario.hypotheticalSkills || []) {
    const skillId = String(override.skillId?._id || override.skillId);
    const skill = context.skillById.get(skillId);
    const actual = actualBySkill.get(skillId);
    if (!skill) continue;
    const source = scenario.startingPointType === "custom_hypothetical"
      ? "hypothetical_custom"
      : actual ? "hypothetical_override" : "hypothetical_addition";
    const record = {
      skillId: skill,
      proficiency: override.proficiency,
      evidenceStatus: "hypothetical",
      learningStatus: "not_started",
      evidenceReferences: [],
      scenarioSource: source,
    };
    effectiveBySkill.set(skillId, record);
    hypotheticalInputs.push({
      skill: skillSummary(skill),
      proficiency: override.proficiency,
      source,
      actualProficiency: actual?.proficiency || null,
      disclaimer: "Scenario-only assumption; this is not recorded as an acquired skill.",
    });
  }
  const hypotheticalEducation = (scenario.hypotheticalQualifications || []).map((qualification) => ({
    _id: null,
    institution: "Scenario assumption",
    degree: qualification,
    academicDiscipline: qualification,
    specialization: "",
    educationLevel: "",
  }));
  const profile = {
    ...(context.profile || {}),
    education: scenario.startingPointType === "existing_profile"
      ? [...(context.profile?.education || []), ...hypotheticalEducation]
      : hypotheticalEducation,
    projects: scenario.startingPointType === "existing_profile" ? context.profile?.projects || [] : [],
    experience: scenario.startingPointType === "existing_profile" ? context.profile?.experience || [] : [],
    certifications: scenario.startingPointType === "existing_profile" ? context.profile?.certifications || [] : [],
  };
  return { profile, studentSkills: [...effectiveBySkill.values()], hypotheticalInputs };
}

function scenarioMetadata(scenario) {
  return {
    id: scenario._id ? String(scenario._id) : null,
    name: scenario.name,
    description: scenario.description || "",
    targetCareerId: String(scenario.targetCareerId?._id || scenario.targetCareerId),
    startingPointType: scenario.startingPointType,
    hypotheticalSkills: (scenario.hypotheticalSkills || []).map((item) => ({
      skillId: String(item.skillId?._id || item.skillId),
      skillName: item.skillId?.name || null,
      proficiency: item.proficiency,
    })),
    hypotheticalQualifications: scenario.hypotheticalQualifications || [],
    weeklyLearningHours: scenario.weeklyLearningHours,
    learningPreferences: scenario.learningPreferences || [],
    targetDate: scenario.targetDate || null,
    constraints: scenario.constraints || "",
    status: scenario.status || "active",
    createdAt: scenario.createdAt,
    updatedAt: scenario.updatedAt,
  };
}

async function analyzeCareerScenario(userId, scenario, providedContext = null) {
  const targetCareerId = String(scenario.targetCareerId?._id || scenario.targetCareerId);
  const context = providedContext || await loadDecisionContext(userId, [targetCareerId]);
  const career = context.careers.find((item) => String(item._id) === targetCareerId);
  if (!career) throw new AppError(400, "SCENARIO_CAREER_INVALID", "The target career must exist and be active");
  const effective = scenarioEffectiveContext(scenario, context);
  const actual = buildCareerDecisionAnalysis(career, context.profile, context.studentSkills, context.skillById);
  const simulated = buildCareerDecisionAnalysis(career, effective.profile, effective.studentSkills, context.skillById);
  const actualMatched = new Set(actual.alignment.matchingSkills.map((item) => item.skill.id));
  const newlyAlignedSkills = simulated.alignment.matchingSkills.filter((item) => !actualMatched.has(item.skill.id));
  const remainingGapIds = new Set([
    ...simulated.alignment.missingSkills.map((item) => item.skill.id),
    ...simulated.alignment.skillsRequiringImprovement.map((item) => item.skill.id),
  ]);
  return {
    scenario: scenarioMetadata(scenario),
    targetCareer: simulated.career,
    actualBaseline: actual,
    simulated,
    differences: {
      alignmentScoreChange: actual.alignment.score === null || simulated.alignment.score === null
        ? null
        : simulated.alignment.score - actual.alignment.score,
      newlyAlignedSkills,
      remainingSkillGaps: simulated.competencies.filter((item) => remainingGapIds.has(item.skill.id)),
      hypotheticalInputs: effective.hypotheticalInputs,
      hypotheticalQualifications: scenario.hypotheticalQualifications || [],
      actualProfileWasModified: false,
    },
    learningContext: {
      weeklyLearningHours: scenario.weeklyLearningHours,
      learningPreferences: scenario.learningPreferences || [],
      targetDate: scenario.targetDate || null,
      constraints: scenario.constraints || "",
      statement: "These inputs help compare preparation choices. Futurion does not convert them into a guaranteed completion date.",
    },
    disclaimer: "Hypothetical values exist only inside this scenario. They are not acquired skills, verified evidence, qualifications, or changes to the real student profile.",
  };
}

function scenarioComparisonSignals(analyses) {
  return {
    buildsMostOnCurrentBackground: extremeIds(analyses, (item) =>
      item.actualBaseline.alignment.matchingSkills.length
      + item.actualBaseline.application.relevantProjects.length
      + item.actualBaseline.application.relevantExperience.length, "max", (item) => item.scenario.id),
    fewestRemainingSkillGaps: extremeIds(analyses, (item) =>
      item.simulated.alignment.missingSkills.length + item.simulated.alignment.skillsRequiringImprovement.length, "min", (item) => item.scenario.id),
    largestHypotheticalChange: extremeIds(analyses, (item) => item.differences.hypotheticalInputs.length + item.differences.hypotheticalQualifications.length, "max", (item) => item.scenario.id),
    explanation: "Signals describe current-profile reuse, remaining gaps, and scenario assumptions. They do not identify a universally better scenario.",
  };
}

async function compareCareerScenarios(userId, scenarios) {
  const context = await loadDecisionContext(
    userId,
    uniqueIds(scenarios.map((scenario) => scenario.targetCareerId?._id || scenario.targetCareerId)),
  );
  const analyses = await Promise.all(scenarios.map((scenario) => analyzeCareerScenario(userId, scenario, context)));
  return {
    scenarios: analyses,
    signals: scenarioComparisonSignals(analyses),
    methodology: "Each scenario is recalculated against current Career and Skill Library records. Actual-profile alignment and scenario-only assumptions remain separate.",
    disclaimer: "Scenario comparison is a decision aid. The student makes the final choice, and no scenario represents guaranteed eligibility or outcomes.",
  };
}

module.exports = {
  MAX_DECISION_ITEMS,
  analyzeCareerComparison,
  analyzeCareerScenario,
  buildCareerDecisionAnalysis,
  compareCareerScenarios,
  competencyDetails,
  dataAvailability,
  loadDecisionContext,
  scenarioEffectiveContext,
  scenarioMetadata,
};
