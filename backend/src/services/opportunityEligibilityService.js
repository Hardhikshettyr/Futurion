const StudentProfile = require("../models/StudentProfile");
const StudentSkill = require("../models/StudentSkill");
const { PROFICIENCY_VALUES, normalizeSkillIdentity } = require("../utils/skillTaxonomy");
const { findOpportunity } = require("./opportunityLibraryService");

const STATUS_LABELS = Object.freeze({ met: "Met", partially_met: "Partially Met", not_met: "Not Met", unknown: "Unknown / Not Provided" });
const EVIDENCE_VALUES = Object.freeze({ self_declared: 1, currently_learning: 1, demonstrated: 2, verified: 3 });

function idOf(value) { return String(value?._id || value); }
function normalized(value) { return normalizeSkillIdentity(value); }
function textMatch(left, right) {
  const a = normalized(left); const b = normalized(right);
  return Boolean(a && b && (a === b || (a.length >= 4 && b.includes(a)) || (b.length >= 4 && a.includes(b))));
}

function result(key, category, importance, title, requirement, status, explanation, evidence = []) {
  return { key, category, importance, title, requirement, status, statusLabel: STATUS_LABELS[status], explanation, evidence };
}

function skillResult(requirement, studentBySkill) {
  const skill = requirement.skillId;
  const skillId = idOf(skill);
  const record = studentBySkill.get(skillId);
  const title = skill?.name || "Required skill";
  const requirementText = `${requirement.minimumProficiency} proficiency; ${requirement.evidenceRequired} evidence`;
  if (!record) return result(`skill:${skillId}`, "skill", requirement.importance, title, requirementText, "unknown", `${title} is not recorded in the student's central Skill profile, so possession cannot be assumed.`);
  const current = PROFICIENCY_VALUES[record.proficiency] || 0;
  const target = PROFICIENCY_VALUES[requirement.minimumProficiency] || 1;
  const requiredEvidence = { recorded: 1, demonstrated: 2, verified: 3 }[requirement.evidenceRequired];
  const actualEvidence = EVIDENCE_VALUES[record.evidenceStatus] || 0;
  const evidence = [`Recorded proficiency: ${record.proficiency}`, `Evidence status: ${record.evidenceStatus}`];
  if (current >= target && actualEvidence >= requiredEvidence) return result(`skill:${skillId}`, "skill", requirement.importance, title, requirementText, "met", `The recorded proficiency and evidence meet this requirement.`, evidence);
  if (current > 0) return result(`skill:${skillId}`, "skill", requirement.importance, title, requirementText, "partially_met", current < target ? `The skill is recorded, but proficiency is below ${requirement.minimumProficiency}.` : `The proficiency target is met, but the evidence level is below ${requirement.evidenceRequired}.`, evidence);
  return result(`skill:${skillId}`, "skill", requirement.importance, title, requirementText, "not_met", "The profile explicitly records no usable proficiency for this requirement.", evidence);
}

function educationLevel(item) {
  const value = normalized(`${item.educationLevel || ""} ${item.degree || ""}`);
  if (!value) return null;
  if (/phd|doctor/.test(value)) return "doctoral";
  if (/master|postgraduate|post graduate|mba|msc|ma\b/.test(value)) return "postgraduate";
  if (/bachelor|undergraduate|under graduate|btech|b\.tech|bsc|ba\b/.test(value)) return "undergraduate";
  if (/diploma|associate/.test(value)) return "diploma";
  if (/secondary|high school|12th|higher secondary/.test(value)) return "secondary";
  return null;
}

function recentGraduateMatches(item, years) {
  if (years === null || years === undefined || item.currentStatus !== "completed") return false;
  if (!item.graduationYear) return null;
  return new Date().getUTCFullYear() - item.graduationYear <= years;
}

function educationEntryAssessment(requirement, item) {
  const checks = [];
  if (requirement.acceptedLevels?.length) {
    const level = educationLevel(item);
    checks.push(level === null ? null : requirement.acceptedLevels.includes(level));
  }
  if (requirement.acceptedDegrees?.length) checks.push(Boolean(item.degree) ? requirement.acceptedDegrees.some((value) => textMatch(value, item.degree)) : null);
  if (requirement.acceptedDisciplines?.length) {
    const values = [item.academicDiscipline, item.specialization].filter(Boolean);
    checks.push(values.length ? requirement.acceptedDisciplines.some((accepted) => values.some((value) => textMatch(accepted, value))) : null);
  }
  if (requirement.acceptedStatuses?.length) {
    const direct = requirement.acceptedStatuses.includes(item.currentStatus);
    const recent = recentGraduateMatches(item, requirement.recentGraduateWithinYears);
    checks.push(direct || recent === true ? true : item.currentStatus ? false : null);
  } else if (requirement.recentGraduateWithinYears !== null && requirement.recentGraduateWithinYears !== undefined) {
    checks.push(recentGraduateMatches(item, requirement.recentGraduateWithinYears));
  }
  return checks;
}

function educationResult(requirement, profile, index) {
  const key = `education:${idOf(requirement._id || index)}`;
  const items = profile?.education || [];
  if (!items.length) return result(key, "education", requirement.importance, "Education", requirement.description, "unknown", "No education records were provided in the profile.");
  const assessments = items.map((item) => ({ item, checks: educationEntryAssessment(requirement, item) }));
  const complete = assessments.find((entry) => entry.checks.length && entry.checks.every((check) => check === true));
  if (complete) return result(key, "education", requirement.importance, "Education", requirement.description, "met", "A recorded education entry meets every structured condition.", [`${complete.item.degree || complete.item.educationLevel || "Education"} at ${complete.item.institution}`]);
  const known = assessments.flatMap((entry) => entry.checks).filter((check) => check !== null);
  if (!known.length) return result(key, "education", requirement.importance, "Education", requirement.description, "unknown", "Education is recorded, but the fields needed for this condition were not provided.");
  if (assessments.some((entry) => entry.checks.some((check) => check === true))) return result(key, "education", requirement.importance, "Education", requirement.description, "partially_met", "At least one structured education condition matches, but no single entry meets all recorded conditions.");
  return result(key, "education", requirement.importance, "Education", requirement.description, "not_met", "The provided education records do not match the structured education condition.");
}

function qualificationResult(requirement, profile, index) {
  const key = `qualification:${idOf(requirement._id || index)}`;
  const qualifications = profile?.certifications || [];
  if (!qualifications.length) return result(key, "qualification", requirement.importance, requirement.name, requirement.description || requirement.name, "unknown", "No certifications or qualifications were provided in the profile.");
  const nameMatches = qualifications.filter((item) => textMatch(item.name, requirement.name));
  const match = requirement.issuer ? nameMatches.find((item) => textMatch(item.issuer, requirement.issuer)) : nameMatches[0];
  if (match) return result(key, "qualification", requirement.importance, requirement.name, requirement.description || requirement.name, "met", "A matching qualification is recorded.", [`${match.name}${match.issuer ? ` — ${match.issuer}` : ""}`]);
  if (nameMatches.length) return result(key, "qualification", requirement.importance, requirement.name, requirement.description || requirement.name, "partially_met", "A similarly named qualification is recorded, but the issuer does not match.");
  return result(key, "qualification", requirement.importance, requirement.name, requirement.description || requirement.name, "not_met", "The profile contains qualifications, but none match this named requirement.");
}

function monthValue(value) {
  const match = String(value || "").match(/^(\d{4})-(\d{2})/);
  return match ? Number(match[1]) * 12 + Number(match[2]) - 1 : null;
}

function experienceMonths(item) {
  const start = monthValue(item.startDate);
  const end = item.currentlyWorking ? new Date().getUTCFullYear() * 12 + new Date().getUTCMonth() : monthValue(item.endDate);
  return start === null || end === null || end < start ? null : end - start + 1;
}

function experienceResult(requirement, profile, index) {
  const key = `experience:${idOf(requirement._id || index)}`;
  const entries = profile?.experience || [];
  if (!entries.length) return result(key, "experience", requirement.importance, "Experience", requirement.description, "unknown", "No experience records were provided in the profile.");
  const relevant = requirement.acceptedTypes?.length ? entries.filter((item) => requirement.acceptedTypes.includes(item.experienceType)) : entries;
  if (!relevant.length) return result(key, "experience", requirement.importance, "Experience", requirement.description, "not_met", "Experience is recorded, but none uses an accepted experience type.");
  const durations = relevant.map(experienceMonths);
  const knownMonths = durations.filter((value) => value !== null).reduce((sum, value) => sum + value, 0);
  if (requirement.minimumMonths === 0) return result(key, "experience", requirement.importance, "Experience", requirement.description, "met", "A recorded experience entry uses an accepted type.", relevant.map((item) => `${item.position} — ${item.organization}`));
  if (!durations.some((value) => value !== null)) return result(key, "experience", requirement.importance, "Experience", requirement.description, "unknown", "Relevant experience is recorded, but dates needed to calculate duration are missing.");
  if (knownMonths >= requirement.minimumMonths) return result(key, "experience", requirement.importance, "Experience", requirement.description, "met", `Approximately ${knownMonths} recorded month(s) meet the ${requirement.minimumMonths}-month minimum.`);
  return result(key, "experience", requirement.importance, "Experience", requirement.description, "partially_met", `Approximately ${knownMonths} recorded month(s) are below the ${requirement.minimumMonths}-month minimum.`);
}

function graduationResult(opportunity, profile) {
  if (!opportunity.eligibleGraduationYears?.length) return null;
  const years = (profile?.education || []).map((item) => item.graduationYear).filter(Boolean);
  if (!years.length) return result("graduation-years", "graduation_year", opportunity.graduationYearImportance, "Graduation year", opportunity.eligibleGraduationYears.join(", "), "unknown", "No graduation year was provided in the profile.");
  const matched = years.find((year) => opportunity.eligibleGraduationYears.includes(year));
  return matched
    ? result("graduation-years", "graduation_year", opportunity.graduationYearImportance, "Graduation year", opportunity.eligibleGraduationYears.join(", "), "met", `The recorded graduation year ${matched} is eligible.`)
    : result("graduation-years", "graduation_year", opportunity.graduationYearImportance, "Graduation year", opportunity.eligibleGraduationYears.join(", "), "not_met", `Recorded graduation year(s) ${years.join(", ")} are outside the specified eligible years.`);
}

function analyzeEligibility(opportunity, profile, studentSkills) {
  const studentBySkill = new Map((studentSkills || []).map((item) => [idOf(item.skillId), item]));
  const requirements = [
    ...(opportunity.requiredSkills || []).map((item) => skillResult(item, studentBySkill)),
    ...(opportunity.requiredEducation || []).map((item, index) => educationResult(item, profile, index)),
    ...(opportunity.requiredQualifications || []).map((item, index) => qualificationResult(item, profile, index)),
    ...(opportunity.experienceRequirements || []).map((item, index) => experienceResult(item, profile, index)),
  ];
  const graduation = graduationResult(opportunity, profile);
  if (graduation) requirements.push(graduation);
  (opportunity.otherConditions || []).forEach((condition, index) => requirements.push(result(
    `condition:${idOf(condition._id || index)}`, "other", condition.importance, condition.label,
    condition.description, "unknown", "This condition is recorded on the opportunity, but Futurion has no authoritative profile field that can verify it.",
  )));
  const mandatory = requirements.filter((item) => item.importance === "mandatory");
  let overall = "insufficient_information";
  if (mandatory.length) {
    if (mandatory.some((item) => item.status === "not_met")) overall = "not_eligible";
    else if (mandatory.some((item) => item.status === "unknown")) overall = "insufficient_information";
    else if (mandatory.some((item) => item.status === "partially_met")) overall = "potentially_eligible";
    else overall = "meets_requirements";
  }
  const labels = { meets_requirements: "Meets Requirements", potentially_eligible: "Potentially Eligible", not_eligible: "Not Eligible", insufficient_information: "Insufficient Information" };
  const metMandatory = mandatory.filter((item) => item.status === "met").length;
  const partialMandatory = mandatory.filter((item) => item.status === "partially_met").length;
  return {
    overall, overallLabel: labels[overall],
    requirements,
    summary: {
      mandatory: mandatory.length, preferred: requirements.length - mandatory.length,
      met: requirements.filter((item) => item.status === "met").length,
      partiallyMet: requirements.filter((item) => item.status === "partially_met").length,
      notMet: requirements.filter((item) => item.status === "not_met").length,
      unknown: requirements.filter((item) => item.status === "unknown").length,
      mandatoryCoverage: mandatory.length ? Math.round(((metMandatory + partialMandatory * 0.5) / mandatory.length) * 100) : null,
    },
    disclaimer: "This deterministic comparison uses only recorded profile data and opportunity conditions. It does not verify official eligibility, guarantee selection, or submit an application.",
  };
}

async function loadEligibilityContext(userId) {
  const [profile, studentSkills] = await Promise.all([
    StudentProfile.findOne({ userId }).lean(),
    StudentSkill.find({ userId }).populate("skillId", "name slug category").lean(),
  ]);
  return { profile, studentSkills };
}

async function getOpportunityEligibility(userId, opportunityId) {
  const [opportunity, context] = await Promise.all([findOpportunity(opportunityId), loadEligibilityContext(userId)]);
  return { opportunityId: idOf(opportunity), ...analyzeEligibility(opportunity, context.profile, context.studentSkills) };
}

module.exports = {
  STATUS_LABELS,
  analyzeEligibility,
  educationLevel,
  experienceMonths,
  getOpportunityEligibility,
  loadEligibilityContext,
  textMatch,
};
