const mongoose = require("mongoose");
const Career = require("../models/Career");
const StudentCareer = require("../models/StudentCareer");
const AppError = require("../utils/AppError");
const { presentCareer } = require("./careerLibraryService");

const MAX_COMPARISON_SELECTIONS = 4;

async function requireActiveCareer(careerId) {
  if (!mongoose.isValidObjectId(careerId)) {
    throw new AppError(400, "CAREER_ID_INVALID", "Enter a valid career identifier");
  }
  const career = await Career.findOne({ _id: careerId, status: "active" }).select("_id").lean();
  if (!career) throw new AppError(404, "CAREER_NOT_FOUND", "Career was not found");
  return career;
}

async function saveCareer(userId, careerId, selectedForComparison = false) {
  await requireActiveCareer(careerId);
  if (selectedForComparison) {
    const selectedCount = await StudentCareer.countDocuments({ userId, selectedForComparison: true });
    const alreadySelected = await StudentCareer.exists({ userId, careerId, selectedForComparison: true });
    if (!alreadySelected && selectedCount >= MAX_COMPARISON_SELECTIONS) {
      throw new AppError(409, "CAREER_COMPARISON_LIMIT", `Select no more than ${MAX_COMPARISON_SELECTIONS} careers for comparison`);
    }
  }
  await StudentCareer.findOneAndUpdate(
    { userId, careerId },
    { $set: { savedAt: new Date(), selectedForComparison } },
    { upsert: true, setDefaultsOnInsert: true },
  );
  return { saved: true, selectedForComparison };
}

async function unsaveCareer(userId, careerId) {
  await requireActiveCareer(careerId);
  const state = await StudentCareer.findOne({ userId, careerId });
  if (!state) return { saved: false, selectedForComparison: false };
  state.savedAt = null;
  state.selectedForComparison = false;
  if (!state.lastViewedAt) await state.deleteOne();
  else await state.save();
  return { saved: false, selectedForComparison: false };
}

async function recordCareerView(userId, careerId) {
  await requireActiveCareer(careerId);
  await StudentCareer.findOneAndUpdate(
    { userId, careerId },
    { $set: { lastViewedAt: new Date() }, $inc: { viewCount: 1 } },
    { upsert: true, setDefaultsOnInsert: true },
  );
  return { recorded: true };
}

async function listCareerState(userId, query, type) {
  const filter = { userId };
  const sort = type === "saved" ? { savedAt: -1 } : { lastViewedAt: -1 };
  if (type === "saved") filter.savedAt = { $ne: null };
  else filter.lastViewedAt = { $ne: null };
  const skip = (query.page - 1) * query.limit;
  const [records, total] = await Promise.all([
    StudentCareer.find(filter).sort(sort).skip(skip).limit(query.limit).populate({
      path: "careerId",
      match: { status: "active" },
      populate: { path: "essentialSkills.skillId desirableSkills.skillId", select: "name slug category" },
    }).lean(),
    StudentCareer.countDocuments(filter),
  ]);
  const items = records.filter((record) => record.careerId).map((record) => ({
    career: presentCareer(record.careerId),
    savedAt: record.savedAt,
    lastViewedAt: record.lastViewedAt,
    viewCount: record.viewCount,
    selectedForComparison: record.selectedForComparison,
  }));
  return {
    items,
    pagination: { page: query.page, limit: query.limit, total, totalPages: Math.max(1, Math.ceil(total / query.limit)) },
  };
}

async function getCareerState(userId, careerId) {
  const state = await StudentCareer.findOne({ userId, careerId }).lean();
  return {
    saved: Boolean(state?.savedAt),
    savedAt: state?.savedAt || null,
    lastViewedAt: state?.lastViewedAt || null,
    selectedForComparison: Boolean(state?.selectedForComparison),
  };
}

async function setComparisonSelection(userId, careerId, selectedForComparison) {
  const current = await StudentCareer.findOne({ userId, careerId });
  if (!current?.savedAt) throw new AppError(409, "CAREER_NOT_SAVED", "Save a career before selecting it for comparison");
  if (selectedForComparison && !current.selectedForComparison) {
    const count = await StudentCareer.countDocuments({ userId, selectedForComparison: true });
    if (count >= MAX_COMPARISON_SELECTIONS) {
      throw new AppError(409, "CAREER_COMPARISON_LIMIT", `Select no more than ${MAX_COMPARISON_SELECTIONS} careers for comparison`);
    }
  }
  current.selectedForComparison = selectedForComparison;
  await current.save();
  return { saved: true, selectedForComparison };
}

module.exports = {
  MAX_COMPARISON_SELECTIONS,
  getCareerState,
  listCareerState,
  recordCareerView,
  saveCareer,
  setComparisonSelection,
  unsaveCareer,
};
