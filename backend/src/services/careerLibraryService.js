const mongoose = require("mongoose");
const Career = require("../models/Career");
const Skill = require("../models/Skill");
const AppError = require("../utils/AppError");
const {
  CAREER_CATEGORIES,
  CATEGORY_LABELS,
  careerSlug,
  cleanCareerLabel,
  normalizeCareerIdentity,
} = require("../utils/careerTaxonomy");

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function presentSkillRelationship(item) {
  const skill = item.skillId;
  return {
    skill: skill && typeof skill === "object" && skill.name
      ? {
          id: String(skill._id),
          name: skill.name,
          slug: skill.slug,
          category: skill.category,
          relatedSkills: (skill.relatedSkills || []).map((related) =>
            related && typeof related === "object" && related.name
              ? { id: String(related._id), name: related.name, slug: related.slug }
              : { id: String(related) },
          ),
        }
      : { id: String(skill) },
    requiredProficiency: item.requiredProficiency,
    rationale: item.rationale || "",
  };
}

function presentRelatedCareer(value) {
  if (value && typeof value === "object" && value.title) {
    return {
      id: String(value._id),
      title: value.title,
      slug: value.slug,
      shortDescription: value.shortDescription,
      careerCategory: value.careerCategory,
      industry: value.industry,
    };
  }
  return { id: String(value) };
}

function presentCertification(value) {
  return {
    name: value.name,
    issuer: value.issuer || "",
    description: value.description || "",
    linkVerified: Boolean(value.linkVerified && value.externalUrl),
    externalUrl: value.linkVerified && value.externalUrl ? value.externalUrl : "",
  };
}

function presentCareer(career, { detail = false } = {}) {
  const source = career.toObject ? career.toObject() : career;
  const base = {
    id: String(source._id),
    title: source.title,
    slug: source.slug,
    shortDescription: source.shortDescription,
    careerCategory: source.careerCategory,
    categoryLabel: CATEGORY_LABELS[source.careerCategory],
    industry: source.industry,
    essentialSkills: (source.essentialSkills || []).map(presentSkillRelationship),
    desirableSkills: (source.desirableSkills || []).map(presentSkillRelationship),
    workModes: source.workModes || [],
    employmentTypes: source.employmentTypes || [],
    entryLevelRoles: source.entryLevelRoles || [],
    tags: source.tags || [],
    featured: Boolean(source.featured),
    popularityRank: source.popularityRank || 0,
    status: source.status,
    createdAt: source.createdAt,
    updatedAt: source.updatedAt,
  };
  if (!detail) return base;
  return {
    ...base,
    overview: source.overview,
    responsibilities: source.responsibilities || [],
    requiredEducation: source.requiredEducation || [],
    acceptedDisciplines: source.acceptedDisciplines || [],
    requiredCertifications: (source.requiredCertifications || []).map(presentCertification),
    recommendedCertifications: (source.recommendedCertifications || []).map(presentCertification),
    toolsAndTechnologies: source.toolsAndTechnologies || [],
    workEnvironments: source.workEnvironments || [],
    relatedCareers: (source.relatedCareers || []).map(presentRelatedCareer),
    careerProgression: source.careerProgression || [],
    learningResources: (source.learningResources || []).filter((item) => item.verified && item.url),
    crossDisciplinePathways: (source.crossDisciplinePathways || []).map((pathway) => ({
      ...pathway,
      additionalSkills: (pathway.additionalSkills || []).map((skill) =>
        skill && typeof skill === "object" && skill.name
          ? { id: String(skill._id), name: skill.name, slug: skill.slug, category: skill.category }
          : { id: String(skill) },
      ),
    })),
    aliases: source.aliases || [],
  };
}

function buildCareerFilter(query, { includeInactive = false } = {}) {
  const filter = {};
  if (includeInactive) {
    if (query.status) filter.status = query.status;
  } else {
    filter.status = "active";
  }
  if (query.category) filter.careerCategory = query.category;
  if (query.industry) filter.industry = new RegExp(escapeRegex(query.industry), "i");
  if (query.education) {
    const search = new RegExp(escapeRegex(query.education), "i");
    filter.$and = [...(filter.$and || []), { $or: [
      { "requiredEducation.qualification": search },
      { "requiredEducation.educationLevel": search },
    ] }];
  }
  if (query.discipline) {
    const search = new RegExp(escapeRegex(query.discipline), "i");
    filter.$and = [...(filter.$and || []), { $or: [
      { "acceptedDisciplines.name": search },
      { "requiredEducation.disciplines": search },
    ] }];
  }
  if (query.skillId) {
    filter.$and = [...(filter.$and || []), { $or: [
      { "essentialSkills.skillId": query.skillId },
      { "desirableSkills.skillId": query.skillId },
    ] }];
  }
  if (query.workMode) filter.workModes = query.workMode;
  if (query.employmentType) filter.employmentTypes = query.employmentType;
  if (query.featured !== undefined) filter.featured = query.featured;
  if (query.q) {
    const search = new RegExp(escapeRegex(query.q), "i");
    filter.$and = [...(filter.$and || []), { $or: [
      { title: search }, { aliases: search }, { shortDescription: search },
      { overview: search }, { industry: search }, { tags: search },
    ] }];
  }
  return filter;
}

function careerSort(sort) {
  return {
    featured: { featured: -1, popularityRank: -1, title: 1 },
    popular: { popularityRank: -1, title: 1 },
    title_asc: { title: 1 },
    title_desc: { title: -1 },
    newest: { createdAt: -1 },
    relevance: { featured: -1, popularityRank: -1, title: 1 },
  }[sort];
}

async function listCareers(query, options = {}) {
  const filter = buildCareerFilter(query, options);
  const skip = (query.page - 1) * query.limit;
  const [records, total] = await Promise.all([
    Career.find(filter)
      .populate("essentialSkills.skillId desirableSkills.skillId", "name slug category")
      .sort(careerSort(query.sort))
      .skip(skip)
      .limit(query.limit)
      .lean(),
    Career.countDocuments(filter),
  ]);
  return {
    items: records.map((record) => presentCareer(record)),
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.limit)),
    },
  };
}

async function findCareer(careerId, { activeOnly = true } = {}) {
  const filter = mongoose.isValidObjectId(careerId) ? { _id: careerId } : { slug: careerId };
  if (activeOnly) filter.status = "active";
  const career = await Career.findOne(filter)
    .populate({ path: "essentialSkills.skillId", select: "name slug category relatedSkills", populate: { path: "relatedSkills", select: "name slug" } })
    .populate({ path: "desirableSkills.skillId", select: "name slug category relatedSkills", populate: { path: "relatedSkills", select: "name slug" } })
    .populate("crossDisciplinePathways.additionalSkills", "name slug category")
    .populate({ path: "relatedCareers", match: activeOnly ? { status: "active" } : {}, select: "title slug shortDescription careerCategory industry status" })
    .lean();
  if (!career) throw new AppError(404, "CAREER_NOT_FOUND", "Career was not found");
  return career;
}

async function getCareerDetails(careerId, options) {
  return presentCareer(await findCareer(careerId, options), { detail: true });
}

async function getCareerCategories() {
  const [categoryCounts, industries] = await Promise.all([
    Career.aggregate([
      { $match: { status: "active" } },
      { $group: { _id: "$careerCategory", count: { $sum: 1 } } },
      { $sort: { count: -1, _id: 1 } },
    ]),
    Career.distinct("industry", { status: "active" }),
  ]);
  const countByCategory = new Map(categoryCounts.map((item) => [item._id, item.count]));
  return {
    categories: CAREER_CATEGORIES.map((key) => ({ key, label: CATEGORY_LABELS[key], count: countByCategory.get(key) || 0 })),
    industries: industries.sort((a, b) => a.localeCompare(b)),
  };
}

async function assertCareerIdentityAvailable({ title, aliases = [], excludeId = null }) {
  const identities = [...new Set([title, ...aliases].map(normalizeCareerIdentity).filter(Boolean))];
  const filter = { $or: [
    { normalizedTitle: { $in: identities } },
    { normalizedAliases: { $in: identities } },
  ] };
  if (excludeId) filter._id = { $ne: excludeId };
  const existing = await Career.findOne(filter).select("title").lean();
  if (existing) throw new AppError(409, "CAREER_IDENTITY_DUPLICATE", `A career or alias already uses this identity: ${existing.title}`);
}

async function validateCareerReferences(values, currentId = null) {
  const essentialIds = (values.essentialSkills || []).map((item) => String(item.skillId));
  const desirableIds = (values.desirableSkills || []).map((item) => String(item.skillId));
  if (new Set(essentialIds).size !== essentialIds.length || new Set(desirableIds).size !== desirableIds.length) {
    throw new AppError(400, "CAREER_SKILL_DUPLICATE", "Skill relationships cannot be duplicated");
  }
  if (essentialIds.some((skillId) => desirableIds.includes(skillId))) {
    throw new AppError(400, "CAREER_SKILL_OVERLAP", "A skill cannot be both essential and desirable");
  }
  const skillIds = [...new Set([
    ...(values.essentialSkills || []).map((item) => item.skillId),
    ...(values.desirableSkills || []).map((item) => item.skillId),
    ...(values.crossDisciplinePathways || []).flatMap((item) => item.additionalSkills || []),
  ].map(String))];
  const relatedIds = [...new Set((values.relatedCareers || []).map(String))];
  if (currentId && relatedIds.includes(String(currentId))) {
    throw new AppError(400, "CAREER_SELF_REFERENCE", "A career cannot be related to itself");
  }
  const [skillCount, careerCount] = await Promise.all([
    skillIds.length ? Skill.countDocuments({ _id: { $in: skillIds }, status: "active" }) : 0,
    relatedIds.length ? Career.countDocuments({ _id: { $in: relatedIds }, status: "active" }) : 0,
  ]);
  if (skillCount !== skillIds.length) throw new AppError(400, "CAREER_SKILL_REFERENCE_INVALID", "Every referenced skill must exist and be active");
  if (careerCount !== relatedIds.length) throw new AppError(400, "CAREER_RELATIONSHIP_INVALID", "Every related career must exist and be active");
}

async function createCareer(values, adminUserId) {
  const title = cleanCareerLabel(values.title);
  await assertCareerIdentityAvailable({ title, aliases: values.aliases });
  const career = new Career({
    ...values,
    _id: new mongoose.Types.ObjectId(),
    title,
    slug: careerSlug(title),
    createdBy: adminUserId,
  });
  await validateCareerReferences(values, career._id);
  try {
    await career.save();
  } catch (error) {
    if (error?.code === 11000) throw new AppError(409, "CAREER_DUPLICATE", "A career with this title or slug already exists");
    throw error;
  }
  if (career.relatedCareers.length) {
    await Career.updateMany({ _id: { $in: career.relatedCareers } }, { $addToSet: { relatedCareers: career._id } });
  }
  return getCareerDetails(career._id, { activeOnly: false });
}

async function updateCareer(careerId, values) {
  const career = await Career.findById(careerId);
  if (!career) throw new AppError(404, "CAREER_NOT_FOUND", "Career was not found");
  const nextTitle = values.title === undefined ? career.title : cleanCareerLabel(values.title);
  const nextAliases = values.aliases === undefined ? career.aliases : values.aliases;
  await assertCareerIdentityAvailable({ title: nextTitle, aliases: nextAliases, excludeId: career._id });
  const mergedReferences = {
    essentialSkills: values.essentialSkills ?? career.essentialSkills,
    desirableSkills: values.desirableSkills ?? career.desirableSkills,
    crossDisciplinePathways: values.crossDisciplinePathways ?? career.crossDisciplinePathways,
    relatedCareers: values.relatedCareers ?? career.relatedCareers,
  };
  await validateCareerReferences(mergedReferences, career._id);
  const previousRelated = new Set(career.relatedCareers.map(String));
  Object.assign(career, values);
  if (values.title !== undefined) career.slug = careerSlug(nextTitle);
  await career.save();
  if (values.relatedCareers !== undefined) {
    const next = new Set(values.relatedCareers.map(String));
    const added = [...next].filter((id) => !previousRelated.has(id));
    const removed = [...previousRelated].filter((id) => !next.has(id));
    if (added.length) await Career.updateMany({ _id: { $in: added } }, { $addToSet: { relatedCareers: career._id } });
    if (removed.length) await Career.updateMany({ _id: { $in: removed } }, { $pull: { relatedCareers: career._id } });
  }
  return getCareerDetails(career._id, { activeOnly: false });
}

async function setCareerStatus(careerId, status) {
  const career = await Career.findByIdAndUpdate(careerId, { $set: { status } }, { returnDocument: "after" });
  if (!career) throw new AppError(404, "CAREER_NOT_FOUND", "Career was not found");
  return presentCareer(career);
}

async function manageRelatedCareer(careerId, targetCareerId, remove = false) {
  const [career, target] = await Promise.all([
    Career.findOne({ _id: careerId, status: "active" }),
    Career.findOne({ _id: targetCareerId, status: "active" }),
  ]);
  if (!career || !target) throw new AppError(404, "CAREER_RELATIONSHIP_INVALID", "Both careers must exist and be active");
  if (String(career._id) === String(target._id)) throw new AppError(400, "CAREER_SELF_REFERENCE", "A career cannot be related to itself");
  const operation = remove ? { $pull: { relatedCareers: target._id } } : { $addToSet: { relatedCareers: target._id } };
  const reverse = remove ? { $pull: { relatedCareers: career._id } } : { $addToSet: { relatedCareers: career._id } };
  await Promise.all([Career.updateOne({ _id: career._id }, operation), Career.updateOne({ _id: target._id }, reverse)]);
  return getCareerDetails(career._id, { activeOnly: false });
}

module.exports = {
  assertCareerIdentityAvailable,
  buildCareerFilter,
  careerSort,
  createCareer,
  findCareer,
  getCareerCategories,
  getCareerDetails,
  listCareers,
  manageRelatedCareer,
  presentCareer,
  setCareerStatus,
  updateCareer,
  validateCareerReferences,
};
