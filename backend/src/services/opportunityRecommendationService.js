const Opportunity = require("../models/Opportunity");
const StudentApplication = require("../models/StudentApplication");
const StudentCareer = require("../models/StudentCareer");
const { analyzeEligibility, loadEligibilityContext, textMatch } = require("./opportunityEligibilityService");
const { presentOpportunity } = require("./opportunityLibraryService");

const POPULATE = [
  { path: "careerIds", select: "title slug careerCategory industry status" },
  { path: "requiredSkills.skillId", select: "name slug category status" },
];

function interestSignals(profile) {
  const values = profile?.preferences || {};
  return [
    ...(values.preferredRoles || []), ...(values.preferredIndustries || []),
    ...(values.careerInterests || []), ...(values.areasToExplore || []),
    values.shortTermObjective, values.longTermObjective,
  ].filter(Boolean);
}

function relevanceForOpportunity(opportunity, context, savedCareerIds) {
  const eligibility = analyzeEligibility(opportunity, context.profile, context.studentSkills);
  const opportunityCareerIds = new Set((opportunity.careerIds || []).map((career) => String(career._id || career)));
  const savedMatches = [...savedCareerIds].filter((id) => opportunityCareerIds.has(id)).length;
  const interests = interestSignals(context.profile);
  const searchValues = [opportunity.title, opportunity.organization, opportunity.location, opportunity.opportunityType,
    ...(opportunity.careerIds || []).flatMap((career) => [career.title, career.industry])].filter(Boolean);
  const interestMatches = interests.filter((interest) => searchValues.some((value) => textMatch(interest, value)));
  const studentSkillIds = new Set(context.studentSkills.map((item) => String(item.skillId?._id || item.skillId)));
  const skillMatches = (opportunity.requiredSkills || []).filter((item) => studentSkillIds.has(String(item.skillId?._id || item.skillId)));
  const eligibilityBase = eligibility.summary.mandatoryCoverage ?? 25;
  const overallAdjustment = { meets_requirements: 10, potentially_eligible: 5, insufficient_information: 0, not_eligible: -20 }[eligibility.overall];
  const score = Math.max(0, Math.min(100, Math.round(
    eligibilityBase * 0.6 + Math.min(20, savedMatches * 20) + Math.min(10, interestMatches.length * 4)
      + Math.min(10, skillMatches.length * 2) + overallAdjustment,
  )));
  const reasons = [];
  if (savedMatches) reasons.push("Connects to a career you saved.");
  if (interestMatches.length) reasons.push(`Matches recorded interests: ${interestMatches.slice(0, 3).join(", ")}.`);
  if (skillMatches.length) reasons.push(`${skillMatches.length} required skill${skillMatches.length === 1 ? " is" : "s are"} already recorded in your Skill profile.`);
  reasons.push(`${eligibility.summary.mandatoryCoverage ?? 0}% of mandatory requirements are met or partially met from available records.`);
  return {
    score, eligibility, reasons,
    missingRequirements: eligibility.requirements.filter((item) => item.importance === "mandatory" && item.status !== "met")
      .map((item) => ({ key: item.key, title: item.title, status: item.status, explanation: item.explanation })),
  };
}

async function recommendOpportunities(userId, { limit = 12 } = {}) {
  const now = new Date();
  const [opportunities, context, savedCareers, states] = await Promise.all([
    Opportunity.find({ status: "active", $or: [{ applicationDeadline: null }, { applicationDeadline: { $gte: now } }] }).populate(POPULATE).lean(),
    loadEligibilityContext(userId),
    StudentCareer.find({ userId, savedAt: { $ne: null } }).select("careerId").lean(),
    StudentApplication.find({ userId }).lean(),
  ]);
  const savedCareerIds = new Set(savedCareers.map((item) => String(item.careerId)));
  const stateByOpportunity = new Map(states.map((item) => [String(item.opportunityId), item]));
  const recommendations = opportunities.map((opportunity) => {
    const relevance = relevanceForOpportunity(opportunity, context, savedCareerIds);
    return {
      opportunity: presentOpportunity(opportunity, { state: stateByOpportunity.get(String(opportunity._id)) }),
      ...relevance,
    };
  }).sort((left, right) => right.score - left.score
    || (left.opportunity.applicationDeadline ? new Date(left.opportunity.applicationDeadline).getTime() : Infinity)
      - (right.opportunity.applicationDeadline ? new Date(right.opportunity.applicationDeadline).getTime() : Infinity))
    .slice(0, limit);
  return {
    items: recommendations,
    methodology: "Recommendations are deterministic. Mandatory eligibility coverage contributes 60%, with recorded saved-career, interest, and skill alignment. Expired and inactive opportunities are excluded. Unknown data is not treated as a mismatch.",
  };
}

module.exports = { interestSignals, recommendOpportunities, relevanceForOpportunity };
