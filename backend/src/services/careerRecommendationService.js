const Career = require("../models/Career");
const StudentProfile = require("../models/StudentProfile");
const StudentSkill = require("../models/StudentSkill");
const { presentCareer, findCareer } = require("./careerLibraryService");
const { PROFICIENCY_VALUES, normalizeSkillIdentity } = require("../utils/skillTaxonomy");

const CAREER_SCORE_WEIGHTS = Object.freeze({
  skills: 35,
  education: 20,
  interests: 15,
  experienceAndProjects: 15,
  workPreferences: 10,
  certifications: 5,
});

function normalized(value) {
  return normalizeSkillIdentity(value);
}

function textMatch(left, right) {
  const a = normalized(left);
  const b = normalized(right);
  return Boolean(a && b && (a === b || (a.length >= 4 && b.includes(a)) || (b.length >= 4 && a.includes(b))));
}

function matchedValues(studentValues, careerValues) {
  return studentValues.filter((studentValue) => careerValues.some((careerValue) => textMatch(studentValue, careerValue)));
}

function skillAssessment(career, studentBySkill) {
  const requirements = [
    ...(career.essentialSkills || []).map((item) => ({ ...item, importance: "essential" })),
    ...(career.desirableSkills || []).map((item) => ({ ...item, importance: "desirable" })),
  ];
  if (!studentBySkill.size) return { available: false, rawScore: null, matchingSkills: [], missingSkills: requirements.map(skillGap), skillsRequiringImprovement: [] };
  let earned = 0;
  let possible = 0;
  const matchingSkills = [];
  const missingSkills = [];
  const skillsRequiringImprovement = [];
  for (const requirement of requirements) {
    const skill = requirement.skillId;
    const importanceWeight = requirement.importance === "essential" ? 2 : 1;
    possible += importanceWeight;
    const record = studentBySkill.get(String(skill._id));
    if (!record) {
      missingSkills.push(skillGap(requirement));
      continue;
    }
    const current = PROFICIENCY_VALUES[record.proficiency] || 0;
    const required = PROFICIENCY_VALUES[requirement.requiredProficiency] || 1;
    const proficiencyRatio = Math.min(1, current / required);
    const evidenceMultiplier = { verified: 1, demonstrated: 1, currently_learning: 0.85, self_declared: 0.75 }[record.evidenceStatus] || 0.7;
    earned += proficiencyRatio * evidenceMultiplier * importanceWeight;
    const item = {
      skill: { id: String(skill._id), name: skill.name, slug: skill.slug, category: skill.category },
      importance: requirement.importance,
      currentProficiency: record.proficiency,
      requiredProficiency: requirement.requiredProficiency,
      evidenceStatus: record.evidenceStatus,
    };
    if (current >= required) matchingSkills.push(item);
    else skillsRequiringImprovement.push(item);
  }
  return {
    available: requirements.length > 0,
    rawScore: possible ? Math.round((earned / possible) * 100) : null,
    matchingSkills,
    missingSkills,
    skillsRequiringImprovement,
  };
}

function skillGap(requirement) {
  const skill = requirement.skillId;
  return {
    skill: { id: String(skill._id), name: skill.name, slug: skill.slug, category: skill.category },
    importance: requirement.importance,
    requiredProficiency: requirement.requiredProficiency,
    rationale: requirement.rationale || "",
  };
}

function educationAssessment(career, profile) {
  const education = profile?.education || [];
  if (!education.length) return { available: false, rawScore: null, matchingEducation: [], explanation: "Add education details to assess pathway alignment." };
  const studentDisciplines = education.flatMap((item) => [item.academicDiscipline, item.specialization, item.degree]).filter(Boolean);
  const matches = (career.acceptedDisciplines || []).filter((discipline) => studentDisciplines.some((item) => textMatch(item, discipline.name)));
  const score = matches.length ? Math.max(...matches.map((match) => ({ common: 100, alternative: 80, transferable: 70 }[match.alignment]))) : 30;
  return {
    available: true,
    rawScore: score,
    matchingEducation: matches,
    studentDisciplines,
    explanation: matches.length
      ? `Your education aligns with ${matches.map((item) => item.name).join(", ")} pathways.`
      : "No direct discipline match was found, but alternative pathways may still be possible and should be investigated.",
  };
}

function interestAssessment(career, profile) {
  const preferences = profile?.preferences || {};
  const signals = [
    ...(preferences.preferredRoles || []), ...(preferences.preferredIndustries || []),
    ...(preferences.careerInterests || []), ...(preferences.areasToExplore || []),
    preferences.shortTermObjective, preferences.longTermObjective,
  ].filter(Boolean);
  if (!signals.length) return { available: false, rawScore: null, matches: [], explanation: "Add career interests to improve this factor." };
  const targets = [career.title, career.careerCategory, career.industry, ...(career.tags || []), ...(career.aliases || []), ...(career.entryLevelRoles || [])];
  const matches = matchedValues(signals, targets);
  return { available: true, rawScore: Math.min(100, 25 + matches.length * 25), matches, explanation: matches.length ? `Matches ${matches.join(", ")} from your preferences.` : "No explicit preference match was found." };
}

function experienceAssessment(career, profile) {
  const projects = profile?.projects || [];
  const experience = profile?.experience || [];
  if (!projects.length && !experience.length) return { available: false, rawScore: null, relevantProjects: [], relevantExperience: [], explanation: "Add projects or experience to assess applied alignment." };
  const targets = [career.industry, ...career.toolsAndTechnologies, ...career.tags, ...career.essentialSkills.map((item) => item.skillId.name), ...career.desirableSkills.map((item) => item.skillId.name)];
  const relevantProjects = projects.filter((project) => [project.title, project.description, project.category, ...(project.technologies || [])].some((item) => targets.some((target) => textMatch(item, target)))).map((item) => ({ id: String(item._id), title: item.title }));
  const relevantExperience = experience.filter((item) => [item.position, item.description, ...(item.skillsUsed || [])].some((value) => targets.some((target) => textMatch(value, target)))).map((item) => ({ id: String(item._id), position: item.position, organization: item.organization, experienceType: item.experienceType }));
  const relevant = relevantProjects.length + relevantExperience.length;
  return { available: true, rawScore: Math.min(100, relevant * 35), relevantProjects, relevantExperience, explanation: relevant ? `${relevant} relevant profile item${relevant === 1 ? "" : "s"} found.` : "No direct project or experience match was found." };
}

function preferenceAssessment(career, profile) {
  const preferences = profile?.preferences || {};
  const modes = preferences.workModes || [];
  const types = preferences.employmentTypes || [];
  if (!modes.length && !types.length) return { available: false, rawScore: null, matches: [], explanation: "Add work preferences to assess working-style alignment." };
  const matchingModes = modes.filter((item) => career.workModes.includes(item));
  const matchingTypes = matchedValues(types, career.employmentTypes);
  const possible = (modes.length ? 1 : 0) + (types.length ? 1 : 0);
  const earned = (modes.length ? matchingModes.length / modes.length : 0) + (types.length ? matchingTypes.length / types.length : 0);
  return { available: true, rawScore: Math.round((earned / possible) * 100), matches: [...matchingModes, ...matchingTypes], explanation: earned ? "Some work preferences align with this career." : "Current work preferences do not directly overlap." };
}

function certificationAssessment(career, profile) {
  const certifications = profile?.certifications || [];
  const targets = [...(career.requiredCertifications || []), ...(career.recommendedCertifications || [])];
  if (!certifications.length || !targets.length) return { available: false, rawScore: null, matches: [], explanation: "Certification scoring is omitted when either side has no certification information." };
  const matches = certifications.filter((student) => targets.some((target) => textMatch(student.name, target.name))).map((item) => item.name);
  return { available: true, rawScore: Math.round((matches.length / targets.length) * 100), matches, explanation: matches.length ? `Matches ${matches.join(", ")}.` : "No listed certification match was found." };
}

function crossDisciplineAssessment(career, profile) {
  const disciplines = (profile?.education || []).flatMap((item) => [item.academicDiscipline, item.specialization, item.degree]).filter(Boolean);
  if (!disciplines.length) return [];
  return (career.crossDisciplinePathways || []).filter((pathway) => pathway.sourceDisciplines.some((source) => disciplines.some((discipline) => textMatch(source, discipline)))).map((pathway) => ({
    sourceDisciplines: pathway.sourceDisciplines,
    whyRelevant: `Your background in ${disciplines.filter((item) => pathway.sourceDisciplines.some((source) => textMatch(source, item))).join(", ")} may offer transferable foundations for this path. This is not an eligibility decision.`,
    transferableStrengths: pathway.transferableStrengths,
    additionalSkills: pathway.additionalSkills.map((skill) => ({ id: String(skill._id), name: skill.name, slug: skill.slug })),
    qualificationConsiderations: pathway.qualificationConsiderations,
    investigationSteps: pathway.investigationSteps,
  }));
}

function contribution(key, assessment) {
  const weight = CAREER_SCORE_WEIGHTS[key];
  return {
    factor: key,
    weight,
    available: assessment.available,
    rawScore: assessment.rawScore,
    weightedPoints: assessment.available ? Number(((assessment.rawScore / 100) * weight).toFixed(2)) : null,
    explanation: assessment.explanation || "",
  };
}

function analyzeCareer(career, profile, studentSkills) {
  const studentBySkill = new Map(studentSkills.map((item) => [String(item.skillId?._id || item.skillId), item]));
  const assessments = {
    skills: skillAssessment(career, studentBySkill),
    education: educationAssessment(career, profile),
    interests: interestAssessment(career, profile),
    experienceAndProjects: experienceAssessment(career, profile),
    workPreferences: preferenceAssessment(career, profile),
    certifications: certificationAssessment(career, profile),
  };
  const contributions = Object.entries(assessments).map(([key, value]) => contribution(key, value));
  const availableWeight = contributions.filter((item) => item.available).reduce((sum, item) => sum + item.weight, 0);
  const earned = contributions.filter((item) => item.available).reduce((sum, item) => sum + item.weightedPoints, 0);
  const score = availableWeight ? Math.round((earned / availableWeight) * 100) : null;
  const reasons = contributions.filter((item) => item.available && item.rawScore >= 50).sort((a, b) => b.weightedPoints - a.weightedPoints).slice(0, 3).map((item) => `${item.factor}: ${item.explanation}`);
  return {
    score,
    confidence: availableWeight >= 70 ? "high" : availableWeight >= 40 ? "medium" : "low",
    availableWeight,
    scoringMethod: "Each available factor is scored from 0–100 and weighted. Missing profile factors are removed from the denominator, not counted as mismatches.",
    disclaimer: "This is a planning aid based on profile-to-library alignment, not an eligibility, hiring, salary, or job-success prediction.",
    contributions,
    matchingSkills: assessments.skills.matchingSkills,
    missingSkills: assessments.skills.missingSkills,
    skillsRequiringImprovement: assessments.skills.skillsRequiringImprovement,
    educationAlignment: assessments.education,
    interestAlignment: assessments.interests,
    relevantProjects: assessments.experienceAndProjects.relevantProjects,
    relevantExperience: assessments.experienceAndProjects.relevantExperience,
    certificationAlignment: assessments.certifications,
    crossDisciplinePathways: crossDisciplineAssessment(career, profile),
    recommendationReasons: reasons.length ? reasons : ["Explore this career to compare its pathways with your goals and fill in missing profile details for a stronger analysis."],
    areasForPreparation: [
      ...assessments.skills.missingSkills.slice(0, 4).map((item) => `Develop ${item.skill.name} toward ${item.requiredProficiency}.`),
      ...assessments.skills.skillsRequiringImprovement.slice(0, 3).map((item) => `Strengthen ${item.skill.name} from ${item.currentProficiency} toward ${item.requiredProficiency}.`),
      ...(assessments.education.matchingEducation?.length ? [] : ["Investigate the education and alternative pathway requirements shown in the career record."]),
    ],
  };
}

async function loadStudentCareerContext(userId) {
  const [profile, studentSkills] = await Promise.all([
    StudentProfile.findOne({ userId }).lean(),
    StudentSkill.find({ userId }).populate("skillId", "name slug category aliases").lean(),
  ]);
  return { profile, studentSkills };
}

async function getCareerFit(userId, careerId) {
  const [career, context] = await Promise.all([findCareer(careerId), loadStudentCareerContext(userId)]);
  return analyzeCareer(career, context.profile, context.studentSkills);
}

async function recommendCareers(userId, { limit = 12 } = {}) {
  const [careers, context] = await Promise.all([
    Career.find({ status: "active" })
      .populate("essentialSkills.skillId desirableSkills.skillId crossDisciplinePathways.additionalSkills", "name slug category aliases")
      .sort({ featured: -1, popularityRank: -1 }).lean(),
    loadStudentCareerContext(userId),
  ]);
  const recommendations = careers.map((career) => ({ career: presentCareer(career), fit: analyzeCareer(career, context.profile, context.studentSkills) }))
    .sort((a, b) => (b.fit.score ?? -1) - (a.fit.score ?? -1) || b.career.popularityRank - a.career.popularityRank)
    .slice(0, limit);
  return { weights: CAREER_SCORE_WEIGHTS, recommendations };
}

module.exports = {
  CAREER_SCORE_WEIGHTS,
  analyzeCareer,
  getCareerFit,
  loadStudentCareerContext,
  recommendCareers,
  textMatch,
};
