const Career = require("../models/Career");
const CareerComparison = require("../models/CareerComparison");
const AppError = require("../utils/AppError");
const { analyzeCareerComparison } = require("./careerDecisionAnalysisService");

function presentCareerReference(career) {
  if (!career || typeof career !== "object" || !career.title) return { id: String(career), unavailable: true };
  return {
    id: String(career._id),
    title: career.title,
    slug: career.slug,
    shortDescription: career.shortDescription,
    careerCategory: career.careerCategory,
    industry: career.industry,
    status: career.status,
    unavailable: career.status !== "active",
  };
}

function presentComparison(comparison) {
  const source = comparison.toObject ? comparison.toObject() : comparison;
  return {
    id: String(source._id),
    name: source.name,
    careers: (source.careerIds || []).map(presentCareerReference),
    careerIds: (source.careerIds || []).map((item) => String(item?._id || item)),
    comparisonSettings: source.comparisonSettings,
    createdAt: source.createdAt,
    updatedAt: source.updatedAt,
  };
}

async function assertActiveCareerIds(careerIds) {
  if (careerIds.length < 2 || careerIds.length > 4 || new Set(careerIds.map(String)).size !== careerIds.length) {
    throw new AppError(400, "COMPARISON_CAREERS_INVALID", "Choose two to four unique careers");
  }
  const count = await Career.countDocuments({ _id: { $in: careerIds }, status: "active" });
  if (count !== careerIds.length) {
    throw new AppError(400, "COMPARISON_CAREER_INVALID", "Every selected career must exist and be active");
  }
}

function comparisonQuery(userId, comparisonId) {
  return CareerComparison.findOne({ _id: comparisonId, userId }).populate(
    "careerIds",
    "title slug shortDescription careerCategory industry status",
  );
}

async function createComparison(userId, values) {
  await assertActiveCareerIds(values.careerIds);
  const comparison = await CareerComparison.create({ userId, ...values });
  return presentComparison(await comparisonQuery(userId, comparison._id));
}

async function listComparisons(userId, query) {
  const skip = (query.page - 1) * query.limit;
  const [items, total] = await Promise.all([
    CareerComparison.find({ userId }).sort({ updatedAt: -1 }).skip(skip).limit(query.limit)
      .populate("careerIds", "title slug shortDescription careerCategory industry status").lean(),
    CareerComparison.countDocuments({ userId }),
  ]);
  return {
    items: items.map(presentComparison),
    pagination: { page: query.page, limit: query.limit, total, totalPages: Math.max(1, Math.ceil(total / query.limit)) },
  };
}

async function getComparisonDocument(userId, comparisonId) {
  const comparison = await CareerComparison.findOne({ _id: comparisonId, userId });
  if (!comparison) throw new AppError(404, "CAREER_COMPARISON_NOT_FOUND", "Saved comparison was not found");
  return comparison;
}

async function getComparison(userId, comparisonId, { withAnalysis = false } = {}) {
  const comparison = await comparisonQuery(userId, comparisonId);
  if (!comparison) throw new AppError(404, "CAREER_COMPARISON_NOT_FOUND", "Saved comparison was not found");
  const presented = presentComparison(comparison);
  if (!withAnalysis) return presented;
  const analysis = await analyzeCareerComparison(userId, presented.careerIds);
  return { ...presented, analysis };
}

async function updateComparison(userId, comparisonId, values) {
  const comparison = await getComparisonDocument(userId, comparisonId);
  if (values.careerIds) await assertActiveCareerIds(values.careerIds);
  Object.assign(comparison, values);
  await comparison.save();
  return getComparison(userId, comparison._id);
}

async function deleteComparison(userId, comparisonId) {
  const result = await CareerComparison.deleteOne({ _id: comparisonId, userId });
  if (!result.deletedCount) throw new AppError(404, "CAREER_COMPARISON_NOT_FOUND", "Saved comparison was not found");
}

module.exports = {
  assertActiveCareerIds,
  createComparison,
  deleteComparison,
  getComparison,
  getComparisonDocument,
  listComparisons,
  presentComparison,
  updateComparison,
};
