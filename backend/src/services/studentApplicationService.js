const StudentApplication = require("../models/StudentApplication");
const AppError = require("../utils/AppError");
const { findOpportunity, presentOpportunity } = require("./opportunityLibraryService");

const APPLICATION_POPULATE = {
  path: "opportunityId",
  populate: [
    { path: "careerIds", select: "title slug careerCategory industry status" },
    { path: "requiredSkills.skillId", select: "name slug category status" },
  ],
};

function presentApplication(application) {
  const value = application.toObject ? application.toObject() : application;
  return {
    id: String(value._id), saved: Boolean(value.saved), inTracker: Boolean(value.inTracker),
    status: value.status, applicationDate: value.applicationDate || null, notes: value.notes || "",
    statusUpdatedAt: value.statusUpdatedAt, createdAt: value.createdAt, updatedAt: value.updatedAt,
    opportunity: value.opportunityId?.title ? presentOpportunity(value.opportunityId) : null,
  };
}

async function populatedApplication(userId, applicationId) {
  const application = await StudentApplication.findOne({ _id: applicationId, userId }).populate(APPLICATION_POPULATE);
  if (!application) throw new AppError(404, "APPLICATION_NOT_FOUND", "Saved opportunity or application was not found");
  return application;
}

async function saveOpportunity(userId, values) {
  const opportunity = await findOpportunity(values.opportunityId);
  if (values.action === "track" && opportunity.applicationDeadline && new Date(opportunity.applicationDeadline).getTime() < Date.now()) {
    throw new AppError(409, "OPPORTUNITY_EXPIRED", "Expired opportunities cannot be added to the active application tracker");
  }
  const set = values.action === "track" ? { saved: true, inTracker: true } : { saved: true };
  const application = await StudentApplication.findOneAndUpdate(
    { userId, opportunityId: opportunity._id },
    { $set: set, $setOnInsert: { status: "interested", statusUpdatedAt: new Date() } },
    { upsert: true, setDefaultsOnInsert: true, returnDocument: "after" },
  );
  return presentApplication(await populatedApplication(userId, application._id));
}

async function updateApplication(userId, applicationId, values) {
  const application = await populatedApplication(userId, applicationId);
  if (values.status !== undefined && values.status !== application.status) {
    application.status = values.status;
    application.statusUpdatedAt = new Date();
  }
  if (values.applicationDate !== undefined) application.applicationDate = values.applicationDate ? new Date(`${values.applicationDate}T00:00:00.000Z`) : null;
  if (values.notes !== undefined) application.notes = values.notes;
  if (values.inTracker !== undefined) application.inTracker = values.inTracker;
  if (values.saved !== undefined) application.saved = values.saved;
  if (application.inTracker) application.saved = true;
  await application.save();
  return presentApplication(await populatedApplication(userId, application._id));
}

async function removeApplication(userId, applicationId) {
  const result = await StudentApplication.deleteOne({ _id: applicationId, userId });
  if (!result.deletedCount) throw new AppError(404, "APPLICATION_NOT_FOUND", "Saved opportunity or application was not found");
}

async function listApplications(userId, query) {
  const filter = { userId };
  if (query.scope === "saved") filter.saved = true;
  if (query.scope === "tracked") filter.inTracker = true;
  if (query.status) filter.status = query.status;
  const skip = (query.page - 1) * query.limit;
  const [records, total] = await Promise.all([
    StudentApplication.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(query.limit).populate(APPLICATION_POPULATE).lean(),
    StudentApplication.countDocuments(filter),
  ]);
  return {
    items: records.map(presentApplication),
    pagination: { page: query.page, limit: query.limit, total, totalPages: Math.max(1, Math.ceil(total / query.limit)) },
  };
}

module.exports = {
  listApplications,
  populatedApplication,
  presentApplication,
  removeApplication,
  saveOpportunity,
  updateApplication,
};
