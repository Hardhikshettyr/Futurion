const mongoose = require("mongoose");
const LearningResource = require("../models/LearningResource");
const LearningResourceCategory = require("../models/LearningResourceCategory");
const Skill = require("../models/Skill");
const StudentLearningResource = require("../models/StudentLearningResource");
const AppError = require("../utils/AppError");
const {
  learningSlug,
  normalizeExternalUrl,
  normalizeLearningIdentity,
} = require("../utils/learningTaxonomy");

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function presentSkill(skill) {
  if (skill && typeof skill === "object" && skill.name) {
    return { id: String(skill._id), name: skill.name, slug: skill.slug, category: skill.category };
  }
  return { id: String(skill) };
}

function presentCategory(category) {
  if (!category) return null;
  const source = category.toObject ? category.toObject() : category;
  if (!source.name) return { id: String(source._id || source) };
  return {
    id: String(source._id),
    name: source.name,
    slug: source.slug,
    description: source.description || "",
    status: source.status,
  };
}

function presentResource(resource, state = null) {
  const source = resource.toObject ? resource.toObject() : resource;
  return {
    id: String(source._id),
    title: source.title,
    description: source.description,
    resourceType: source.resourceType,
    provider: source.provider,
    externalUrl: source.externalUrl,
    skillsCovered: (source.skillsCovered || []).map(presentSkill),
    prerequisites: (source.prerequisites || []).map(presentSkill),
    difficulty: source.difficulty,
    duration: source.duration || "",
    priceType: source.priceType,
    priceAmount: source.priceAmount ?? null,
    currency: source.currency || "",
    certificateAvailable: Boolean(source.certificateAvailable),
    category: presentCategory(source.categoryId),
    status: source.status,
    createdAt: source.createdAt,
    updatedAt: source.updatedAt,
    ...(state ? { studentState: state } : {}),
  };
}

function resourcePopulate(query) {
  return query
    .populate("skillsCovered prerequisites", "name slug category status")
    .populate("categoryId", "name slug description status");
}

function resourceSort(sort) {
  return {
    relevance: { status: 1, title: 1 },
    title_asc: { title: 1 },
    title_desc: { title: -1 },
    provider: { provider: 1, title: 1 },
    newest: { createdAt: -1 },
    difficulty: { difficulty: 1, title: 1 },
  }[sort];
}

function buildResourceFilter(query, { includeInactive = false } = {}) {
  const filter = {};
  filter.status = includeInactive && query.status ? query.status : "active";
  if (query.resourceType) filter.resourceType = query.resourceType;
  if (query.skillId) filter.skillsCovered = query.skillId;
  if (query.difficulty) filter.difficulty = query.difficulty;
  if (query.priceType) filter.priceType = query.priceType;
  if (query.provider) filter.provider = new RegExp(`^${escapeRegex(query.provider)}$`, "i");
  if (query.categoryId) filter.categoryId = query.categoryId;
  if (query.q) {
    const search = new RegExp(escapeRegex(query.q), "i");
    filter.$or = [{ title: search }, { description: search }, { provider: search }];
  }
  return filter;
}

function presentStudentState(record) {
  if (!record) return { id: null, bookmarked: false, inLearningLibrary: false, status: "not_started", startedAt: null, completedAt: null, updatedAt: null };
  return {
    id: String(record._id),
    bookmarked: Boolean(record.bookmarked),
    inLearningLibrary: Boolean(record.inLearningLibrary),
    status: record.status,
    startedAt: record.startedAt || null,
    completedAt: record.completedAt || null,
    updatedAt: record.updatedAt,
  };
}

async function listResources(query, { includeInactive = false, userId = null } = {}) {
  const filter = buildResourceFilter(query, { includeInactive });
  const skip = (query.page - 1) * query.limit;
  const [records, total] = await Promise.all([
    resourcePopulate(LearningResource.find(filter)).sort(resourceSort(query.sort)).skip(skip).limit(query.limit).lean(),
    LearningResource.countDocuments(filter),
  ]);
  let stateByResource = new Map();
  if (userId && records.length) {
    const states = await StudentLearningResource.find({ userId, resourceId: { $in: records.map((item) => item._id) } }).lean();
    stateByResource = new Map(states.map((item) => [String(item.resourceId), item]));
  }
  return {
    items: records.map((record) => presentResource(record, userId ? presentStudentState(stateByResource.get(String(record._id))) : null)),
    pagination: { page: query.page, limit: query.limit, total, totalPages: Math.max(1, Math.ceil(total / query.limit)) },
  };
}

async function findResource(resourceId, { activeOnly = true } = {}) {
  if (!mongoose.isValidObjectId(resourceId)) throw new AppError(400, "LEARNING_RESOURCE_ID_INVALID", "Enter a valid learning resource identifier");
  const filter = { _id: resourceId };
  if (activeOnly) filter.status = "active";
  const resource = await resourcePopulate(LearningResource.findOne(filter)).lean();
  if (!resource) throw new AppError(404, "LEARNING_RESOURCE_NOT_FOUND", "Learning resource was not found");
  return resource;
}

async function getResourceDetails(resourceId, { activeOnly = true, userId = null } = {}) {
  const resource = await findResource(resourceId, { activeOnly });
  const state = userId ? await StudentLearningResource.findOne({ userId, resourceId: resource._id }).lean() : null;
  return presentResource(resource, userId ? presentStudentState(state) : null);
}

async function validateResourceReferences(values) {
  const skillIds = [...new Set([...(values.skillsCovered || []), ...(values.prerequisites || [])].map(String))];
  const [skillCount, category] = await Promise.all([
    skillIds.length ? Skill.countDocuments({ _id: { $in: skillIds }, status: "active" }) : 0,
    LearningResourceCategory.exists({ _id: values.categoryId, status: "active" }),
  ]);
  if (skillCount !== skillIds.length) throw new AppError(400, "LEARNING_SKILL_REFERENCE_INVALID", "Every referenced skill must exist and be active");
  if (!category) throw new AppError(400, "LEARNING_CATEGORY_INVALID", "The selected learning category must exist and be active");
}

async function assertResourceAvailable(values, excludeId = null) {
  let normalizedUrl;
  try { normalizedUrl = normalizeExternalUrl(values.externalUrl); }
  catch (error) { throw new AppError(400, "LEARNING_RESOURCE_URL_INVALID", error.message); }
  const filter = { $or: [
    { normalizedUrl },
    {
      normalizedTitle: normalizeLearningIdentity(values.title),
      normalizedProvider: normalizeLearningIdentity(values.provider),
    },
  ] };
  if (excludeId) filter._id = { $ne: excludeId };
  const existing = await LearningResource.findOne(filter).select("title provider").lean();
  if (existing) throw new AppError(409, "LEARNING_RESOURCE_DUPLICATE", "This learning resource is already in the library");
}

async function createResource(values, adminUserId) {
  await Promise.all([validateResourceReferences(values), assertResourceAvailable(values)]);
  try {
    const resource = await LearningResource.create({ ...values, createdBy: adminUserId });
    return getResourceDetails(resource._id, { activeOnly: false });
  } catch (error) {
    if (error?.code === 11000) throw new AppError(409, "LEARNING_RESOURCE_DUPLICATE", "This learning resource is already in the library");
    throw error;
  }
}

async function updateResource(resourceId, values) {
  const resource = await LearningResource.findById(resourceId);
  if (!resource) throw new AppError(404, "LEARNING_RESOURCE_NOT_FOUND", "Learning resource was not found");
  const merged = {
    title: values.title ?? resource.title,
    provider: values.provider ?? resource.provider,
    externalUrl: values.externalUrl ?? resource.externalUrl,
    categoryId: values.categoryId ?? resource.categoryId,
    skillsCovered: values.skillsCovered ?? resource.skillsCovered,
    prerequisites: values.prerequisites ?? resource.prerequisites,
  };
  const checks = [];
  if (values.categoryId !== undefined || values.skillsCovered !== undefined || values.prerequisites !== undefined) {
    checks.push(validateResourceReferences(merged));
  }
  if (values.title !== undefined || values.provider !== undefined || values.externalUrl !== undefined) {
    checks.push(assertResourceAvailable(merged, resource._id));
  }
  await Promise.all(checks);
  Object.assign(resource, values);
  try { await resource.save(); }
  catch (error) {
    if (error?.code === 11000) throw new AppError(409, "LEARNING_RESOURCE_DUPLICATE", "This learning resource is already in the library");
    throw error;
  }
  return getResourceDetails(resource._id, { activeOnly: false });
}

async function listCategories({ includeInactive = false } = {}) {
  const filter = includeInactive ? {} : { status: "active" };
  const categories = await LearningResourceCategory.find(filter).sort({ name: 1 }).lean();
  return categories.map(presentCategory);
}

async function createCategory(values, adminUserId) {
  const identity = normalizeLearningIdentity(values.name);
  const existing = await LearningResourceCategory.findOne({ normalizedName: identity }).lean();
  if (existing) throw new AppError(409, "LEARNING_CATEGORY_DUPLICATE", "A learning category with this name already exists");
  try {
    const category = await LearningResourceCategory.create({ ...values, createdBy: adminUserId, slug: learningSlug(values.name) });
    return presentCategory(category);
  } catch (error) {
    if (error?.code === 11000) throw new AppError(409, "LEARNING_CATEGORY_DUPLICATE", "A learning category with this name already exists");
    throw error;
  }
}

async function updateCategory(categoryId, values) {
  const category = await LearningResourceCategory.findById(categoryId);
  if (!category) throw new AppError(404, "LEARNING_CATEGORY_NOT_FOUND", "Learning category was not found");
  if (values.status === "inactive") {
    const usedByActiveResource = await LearningResource.exists({ categoryId: category._id, status: "active" });
    if (usedByActiveResource) {
      throw new AppError(409, "LEARNING_CATEGORY_IN_USE", "Move or deactivate active resources before deactivating this category");
    }
  }
  if (values.name && normalizeLearningIdentity(values.name) !== category.normalizedName) {
    const duplicate = await LearningResourceCategory.exists({ _id: { $ne: category._id }, normalizedName: normalizeLearningIdentity(values.name) });
    if (duplicate) throw new AppError(409, "LEARNING_CATEGORY_DUPLICATE", "A learning category with this name already exists");
    values.slug = learningSlug(values.name);
  }
  Object.assign(category, values);
  await category.save();
  return presentCategory(category);
}

async function getResourceFilterOptions() {
  const [providers, categories] = await Promise.all([
    LearningResource.distinct("provider", { status: "active" }),
    listCategories(),
  ]);
  return { providers: providers.sort((a, b) => a.localeCompare(b)), categories };
}

module.exports = {
  assertResourceAvailable,
  buildResourceFilter,
  createCategory,
  createResource,
  findResource,
  getResourceDetails,
  getResourceFilterOptions,
  listCategories,
  listResources,
  presentCategory,
  presentResource,
  presentStudentState,
  updateCategory,
  updateResource,
  validateResourceReferences,
};
