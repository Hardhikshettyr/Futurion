const StudentLearningResource = require("../models/StudentLearningResource");
const AppError = require("../utils/AppError");
const {
  findResource,
  presentResource,
  presentStudentState,
} = require("./learningResourceService");

function learningStateQuery(userId, itemId) {
  return StudentLearningResource.findOne({ _id: itemId, userId })
    .populate({
      path: "resourceId",
      match: { status: "active" },
      populate: [
        { path: "skillsCovered prerequisites", select: "name slug category status" },
        { path: "categoryId", select: "name slug description status" },
      ],
    });
}

function presentLearningItem(item) {
  const source = item.toObject ? item.toObject() : item;
  return {
    ...presentStudentState(source),
    resource: source.resourceId && source.resourceId.title ? presentResource(source.resourceId) : null,
    lastActivityAt: source.lastActivityAt,
  };
}

async function requireOwnedLearningItem(userId, itemId) {
  const item = await StudentLearningResource.findOne({ _id: itemId, userId });
  if (!item) throw new AppError(404, "LEARNING_ITEM_NOT_FOUND", "Learning library item was not found");
  return item;
}

async function saveLearningResource(userId, { resourceId, action }) {
  await findResource(resourceId);
  const set = { lastActivityAt: new Date() };
  if (action === "bookmark") set.bookmarked = true;
  else set.inLearningLibrary = true;
  const item = await StudentLearningResource.findOneAndUpdate(
    { userId, resourceId },
    { $set: set, $setOnInsert: { status: "not_started" } },
    { upsert: true, setDefaultsOnInsert: true, returnDocument: "after" },
  );
  return presentLearningItem(await learningStateQuery(userId, item._id));
}

async function updateLearningItem(userId, itemId, values) {
  const item = await requireOwnedLearningItem(userId, itemId);
  Object.assign(item, values);
  if (values.status === "in_progress") {
    item.inLearningLibrary = true;
    item.startedAt ||= new Date();
    item.completedAt = null;
  } else if (values.status === "completed") {
    item.inLearningLibrary = true;
    item.startedAt ||= new Date();
    item.completedAt = new Date();
  } else if (values.status === "not_started") {
    item.completedAt = null;
  }
  item.lastActivityAt = new Date();
  await item.save();
  return presentLearningItem(await learningStateQuery(userId, item._id));
}

async function removeLearningItem(userId, itemId) {
  const result = await StudentLearningResource.deleteOne({ _id: itemId, userId });
  if (!result.deletedCount) throw new AppError(404, "LEARNING_ITEM_NOT_FOUND", "Learning library item was not found");
}

function learningLibraryFilter(userId, scope) {
  const filter = { userId };
  if (scope === "bookmarked") filter.bookmarked = true;
  else if (scope === "learning") filter.inLearningLibrary = true;
  else if (scope === "completed") filter.status = "completed";
  else filter.$or = [{ bookmarked: true }, { inLearningLibrary: true }];
  return filter;
}

async function listLearningLibrary(userId, query) {
  const filter = learningLibraryFilter(userId, query.scope);
  const skip = (query.page - 1) * query.limit;
  const [records, total] = await Promise.all([
    StudentLearningResource.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(query.limit)
      .populate({
        path: "resourceId",
        match: { status: "active" },
        populate: [
          { path: "skillsCovered prerequisites", select: "name slug category status" },
          { path: "categoryId", select: "name slug description status" },
        ],
      }).lean(),
    StudentLearningResource.countDocuments(filter),
  ]);
  return {
    items: records.filter((item) => item.resourceId).map(presentLearningItem),
    pagination: { page: query.page, limit: query.limit, total, totalPages: Math.max(1, Math.ceil(total / query.limit)) },
  };
}

async function getLearningProgress(userId) {
  const records = await StudentLearningResource.find({
    userId,
    $or: [{ bookmarked: true }, { inLearningLibrary: true }],
  }).sort({ updatedAt: -1 }).populate({
    path: "resourceId",
    match: { status: "active" },
    populate: [
      { path: "skillsCovered", select: "name slug category status" },
      { path: "prerequisites", select: "name slug category status" },
      { path: "categoryId", select: "name slug description status" },
    ],
  }).lean();
  const active = records.filter((item) => item.resourceId);
  const bySkill = new Map();
  active.filter((item) => item.inLearningLibrary).forEach((item) => {
    item.resourceId.skillsCovered.forEach((skill) => {
      const id = String(skill._id);
      const current = bySkill.get(id) || { skill: { id, name: skill.name, slug: skill.slug }, resources: 0, inProgress: 0, completed: 0 };
      current.resources += 1;
      if (item.status === "in_progress") current.inProgress += 1;
      if (item.status === "completed") current.completed += 1;
      bySkill.set(id, current);
    });
  });
  return {
    summary: {
      totalSaved: active.length,
      bookmarked: active.filter((item) => item.bookmarked).length,
      inLearningLibrary: active.filter((item) => item.inLearningLibrary).length,
      notStarted: active.filter((item) => item.inLearningLibrary && item.status === "not_started").length,
      inProgress: active.filter((item) => item.status === "in_progress").length,
      completed: active.filter((item) => item.status === "completed").length,
    },
    bySkill: [...bySkill.values()].sort((a, b) => b.completed - a.completed || b.inProgress - a.inProgress || a.skill.name.localeCompare(b.skill.name)),
    recentActivities: active.slice(0, 8).map(presentLearningItem),
    methodology: "Progress reports saved records and current statuses only. Futurion does not infer completion percentages or verified skill acquisition.",
  };
}

module.exports = {
  getLearningProgress,
  learningLibraryFilter,
  listLearningLibrary,
  presentLearningItem,
  removeLearningItem,
  requireOwnedLearningItem,
  saveLearningResource,
  updateLearningItem,
};
