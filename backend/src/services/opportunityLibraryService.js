const mongoose = require("mongoose");
const Career = require("../models/Career");
const Opportunity = require("../models/Opportunity");
const Skill = require("../models/Skill");
const StudentApplication = require("../models/StudentApplication");
const AppError = require("../utils/AppError");
const { CATEGORY_LABELS } = require("../utils/careerTaxonomy");
const { OPPORTUNITY_TYPE_LABELS, opportunitySlug } = require("../utils/opportunityTaxonomy");

const POPULATE = [
  { path: "careerIds", select: "title slug careerCategory industry status" },
  { path: "requiredSkills.skillId", select: "name slug category status" },
];

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function studentState(value) {
  if (!value) return { saved: false, inTracker: false, applicationId: null, status: null, applicationDate: null };
  return {
    applicationId: String(value._id), saved: Boolean(value.saved), inTracker: Boolean(value.inTracker),
    status: value.status, applicationDate: value.applicationDate || null,
  };
}

function presentCareer(value) {
  return value?.title ? { id: String(value._id), title: value.title, slug: value.slug, careerCategory: value.careerCategory, categoryLabel: CATEGORY_LABELS[value.careerCategory], industry: value.industry } : { id: String(value) };
}

function presentSkillRequirement(value) {
  const skill = value.skillId;
  return {
    skill: skill?.name ? { id: String(skill._id), name: skill.name, slug: skill.slug, category: skill.category } : { id: String(skill) },
    minimumProficiency: value.minimumProficiency, evidenceRequired: value.evidenceRequired,
    importance: value.importance, rationale: value.rationale || "",
  };
}

function presentOpportunity(opportunity, { detail = false, state = null, includeUnverifiedUrl = false } = {}) {
  const value = opportunity.toObject ? opportunity.toObject() : opportunity;
  const deadline = value.applicationDeadline ? new Date(value.applicationDeadline) : null;
  const expired = Boolean(deadline && deadline.getTime() < Date.now());
  const base = {
    id: String(value._id), title: value.title, organization: value.organization, slug: value.slug,
    opportunityType: value.opportunityType, opportunityTypeLabel: OPPORTUNITY_TYPE_LABELS[value.opportunityType],
    careers: (value.careerIds || []).map(presentCareer),
    requiredSkills: (value.requiredSkills || []).map(presentSkillRequirement),
    location: value.location, workMode: value.workMode, compensation: value.compensation || {},
    applicationDeadline: deadline, expired,
    daysRemaining: deadline && !expired ? Math.ceil((deadline.getTime() - Date.now()) / 86400000) : null,
    status: value.status, studentState: studentState(state), createdAt: value.createdAt, updatedAt: value.updatedAt,
  };
  if (!detail) return { ...base, description: value.description.slice(0, 360) };
  return {
    ...base, description: value.description,
    requiredEducation: value.requiredEducation || [], requiredQualifications: value.requiredQualifications || [],
    experienceRequirements: value.experienceRequirements || [], eligibleGraduationYears: value.eligibleGraduationYears || [],
    graduationYearImportance: value.graduationYearImportance, otherConditions: value.otherConditions || [],
    externalApplicationUrl: value.externalUrlVerified || includeUnverifiedUrl ? value.externalApplicationUrl : "",
    externalUrlVerified: Boolean(value.externalUrlVerified), sourceVerifiedAt: value.sourceVerifiedAt || null,
  };
}

async function careerIdsForCategory(category) {
  if (!category) return null;
  const careers = await Career.find({ status: "active", careerCategory: category }).select("_id").lean();
  return careers.map((career) => career._id);
}

function deadlineFilter(value, now = new Date()) {
  if (value === "all") return null;
  if (value === "expired") return { $lt: now };
  if (value === "no_deadline") return null;
  const days = { upcoming_7: 7, upcoming_30: 30, upcoming_90: 90 }[value];
  if (days) return { $gte: now, $lte: new Date(now.getTime() + days * 86400000) };
  return { $gte: now };
}

async function buildOpportunityFilter(query, { includeInactive = false } = {}) {
  const filter = includeInactive ? (query.status ? { status: query.status } : {}) : { status: "active" };
  if (query.opportunityType) filter.opportunityType = query.opportunityType;
  if (query.workMode) filter.workMode = query.workMode;
  if (query.skillId) filter["requiredSkills.skillId"] = query.skillId;
  if (query.location) filter.location = new RegExp(escapeRegex(query.location), "i");
  if (query.q) {
    const search = new RegExp(escapeRegex(query.q), "i");
    filter.$or = [{ title: search }, { organization: search }, { description: search }, { location: search }];
  }
  const careerIds = await careerIdsForCategory(query.careerCategory);
  if (careerIds) filter.careerIds = { $in: careerIds };
  if (query.deadline === "no_deadline") filter.applicationDeadline = null;
  else {
    const deadline = deadlineFilter(query.deadline);
    if (query.deadline === "open") filter.$and = [...(filter.$and || []), { $or: [{ applicationDeadline: null }, { applicationDeadline: deadline }] }];
    else if (deadline) filter.applicationDeadline = deadline;
  }
  return filter;
}

function opportunitySort(sort) {
  return {
    deadline: { applicationDeadline: 1, title: 1 }, newest: { createdAt: -1 },
    title_asc: { title: 1 }, relevance: { applicationDeadline: 1, title: 1 },
  }[sort];
}

async function listOpportunities(query, { includeInactive = false, userId = null } = {}) {
  const filter = await buildOpportunityFilter(query, { includeInactive });
  const skip = (query.page - 1) * query.limit;
  const [records, total] = await Promise.all([
    Opportunity.find(filter).populate(POPULATE).sort(opportunitySort(query.sort)).skip(skip).limit(query.limit).lean(),
    Opportunity.countDocuments(filter),
  ]);
  const states = userId && records.length
    ? await StudentApplication.find({ userId, opportunityId: { $in: records.map((item) => item._id) } }).lean()
    : [];
  const stateByOpportunity = new Map(states.map((item) => [String(item.opportunityId), item]));
  return {
    items: records.map((record) => presentOpportunity(record, { state: stateByOpportunity.get(String(record._id)) })),
    pagination: { page: query.page, limit: query.limit, total, totalPages: Math.max(1, Math.ceil(total / query.limit)) },
  };
}

async function findOpportunity(opportunityId, { activeOnly = true } = {}) {
  const filter = mongoose.isValidObjectId(opportunityId) ? { _id: opportunityId } : { slug: opportunityId };
  if (activeOnly) filter.status = "active";
  const opportunity = await Opportunity.findOne(filter).populate(POPULATE).lean();
  if (!opportunity) throw new AppError(404, "OPPORTUNITY_NOT_FOUND", "Opportunity was not found");
  return opportunity;
}

async function getOpportunityDetails(opportunityId, { activeOnly = true, userId = null, includeUnverifiedUrl = false } = {}) {
  const opportunity = await findOpportunity(opportunityId, { activeOnly });
  const state = userId ? await StudentApplication.findOne({ userId, opportunityId: opportunity._id }).lean() : null;
  return presentOpportunity(opportunity, { detail: true, state, includeUnverifiedUrl });
}

async function getOpportunityFilters() {
  const [locations, counts] = await Promise.all([
    Opportunity.distinct("location", { status: "active" }),
    Opportunity.aggregate([{ $match: { status: "active" } }, { $group: { _id: "$opportunityType", count: { $sum: 1 } } }]),
  ]);
  const countByType = new Map(counts.map((item) => [item._id, item.count]));
  return {
    locations: locations.sort((a, b) => a.localeCompare(b)),
    opportunityTypes: Object.entries(OPPORTUNITY_TYPE_LABELS).map(([key, label]) => ({ key, label, count: countByType.get(key) || 0 })),
  };
}

async function validateReferences(values) {
  const careerIds = [...new Set((values.careerIds || []).map(String))];
  const skillIds = [...new Set((values.requiredSkills || []).map((item) => String(item.skillId)))];
  const [careerCount, skillCount] = await Promise.all([
    careerIds.length ? Career.countDocuments({ _id: { $in: careerIds }, status: "active" }) : 0,
    skillIds.length ? Skill.countDocuments({ _id: { $in: skillIds }, status: "active" }) : 0,
  ]);
  if (careerCount !== careerIds.length) throw new AppError(400, "OPPORTUNITY_CAREER_REFERENCE_INVALID", "Every referenced career must exist and be active");
  if (skillCount !== skillIds.length) throw new AppError(400, "OPPORTUNITY_SKILL_REFERENCE_INVALID", "Every referenced skill must exist and be active");
}

function databaseValues(values, existing = null) {
  const next = { ...values };
  if (values.applicationDeadline !== undefined) next.applicationDeadline = values.applicationDeadline ? new Date(`${values.applicationDeadline}T23:59:59.999Z`) : null;
  if (values.externalApplicationUrl !== undefined && values.externalApplicationUrl !== existing?.externalApplicationUrl && values.externalUrlVerified === undefined) {
    next.externalUrlVerified = false;
    next.sourceVerifiedAt = null;
  }
  if (values.externalUrlVerified === true) next.sourceVerifiedAt = new Date();
  if (values.externalUrlVerified === false) next.sourceVerifiedAt = null;
  return next;
}

async function createOpportunity(values, adminUserId) {
  await validateReferences(values);
  try {
    const opportunity = await Opportunity.create({ ...databaseValues(values), slug: opportunitySlug(`${values.organization}-${values.title}`), createdBy: adminUserId });
    return getOpportunityDetails(opportunity._id, { activeOnly: false, includeUnverifiedUrl: true });
  } catch (error) {
    if (error?.code === 11000) throw new AppError(409, "OPPORTUNITY_DUPLICATE", "This organization and opportunity already exist");
    throw error;
  }
}

async function updateOpportunity(opportunityId, values) {
  const opportunity = await Opportunity.findById(opportunityId);
  if (!opportunity) throw new AppError(404, "OPPORTUNITY_NOT_FOUND", "Opportunity was not found");
  await validateReferences({
    careerIds: values.careerIds ?? opportunity.careerIds,
    requiredSkills: values.requiredSkills ?? opportunity.requiredSkills,
  });
  Object.assign(opportunity, databaseValues(values, opportunity));
  if (values.title !== undefined || values.organization !== undefined) opportunity.slug = opportunitySlug(`${opportunity.organization}-${opportunity.title}`);
  try { await opportunity.save(); }
  catch (error) {
    if (error?.code === 11000) throw new AppError(409, "OPPORTUNITY_DUPLICATE", "This organization and opportunity already exist");
    throw error;
  }
  return getOpportunityDetails(opportunity._id, { activeOnly: false, includeUnverifiedUrl: true });
}

async function setOpportunityStatus(opportunityId, status) {
  const opportunity = await Opportunity.findByIdAndUpdate(opportunityId, { $set: { status } }, { returnDocument: "after", runValidators: true });
  if (!opportunity) throw new AppError(404, "OPPORTUNITY_NOT_FOUND", "Opportunity was not found");
  return getOpportunityDetails(opportunity._id, { activeOnly: false, includeUnverifiedUrl: true });
}

async function deleteOpportunity(opportunityId) {
  const opportunity = await Opportunity.findByIdAndDelete(opportunityId);
  if (!opportunity) throw new AppError(404, "OPPORTUNITY_NOT_FOUND", "Opportunity was not found");
  await StudentApplication.deleteMany({ opportunityId: opportunity._id });
}

module.exports = {
  buildOpportunityFilter,
  createOpportunity,
  deadlineFilter,
  deleteOpportunity,
  findOpportunity,
  getOpportunityDetails,
  getOpportunityFilters,
  listOpportunities,
  presentOpportunity,
  setOpportunityStatus,
  studentState,
  updateOpportunity,
  validateReferences,
};
