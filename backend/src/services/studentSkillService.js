const mongoose = require("mongoose");
const Skill = require("../models/Skill");
const StudentSkill = require("../models/StudentSkill");
const AppError = require("../utils/AppError");
const { getOrCreateStudentProfile } = require("./studentProfileService");
const {
  PROFICIENCY_VALUES,
  legacyCategory,
  normalizeSkillIdentity,
} = require("../utils/skillTaxonomy");
const { presentSkill } = require("./skillLibraryService");

function cleanDate(value) {
  return value ? new Date(value) : null;
}

function deriveEvidenceStatus(studentSkill) {
  if (studentSkill.evidenceStatus === "verified") return "verified";
  if (studentSkill.evidenceReferences?.length) return "demonstrated";
  if (["learning", "practicing"].includes(studentSkill.learningStatus)) {
    return "currently_learning";
  }
  return "self_declared";
}

function presentEvidence(evidence) {
  const source = evidence?.toObject ? evidence.toObject() : evidence;
  return {
    id: String(source._id),
    evidenceType: source.evidenceType,
    referenceId: source.referenceId ? String(source.referenceId) : null,
    description: source.description || "",
    externalUrl: source.externalUrl || "",
    date: source.date || null,
    createdAt: source.createdAt,
  };
}

function presentStudentSkill(studentSkill) {
  const source = studentSkill?.toObject ? studentSkill.toObject() : studentSkill;
  const skill = source.skillId?.name ? source.skillId : source.skill;
  return {
    id: String(source._id),
    skill: presentSkill(skill),
    proficiency: source.proficiency,
    evidenceStatus: source.evidenceStatus,
    learningStatus: source.learningStatus,
    confidenceLevel: source.confidenceLevel ?? null,
    description: source.description || "",
    evidence: (source.evidenceReferences || []).map(presentEvidence),
    evidenceCount: (source.evidenceReferences || []).length,
    startedAt: source.startedAt || null,
    lastPracticedAt: source.lastPracticedAt || null,
    acquiredAt: source.acquiredAt || null,
    notes: source.notes || "",
    createdAt: source.createdAt,
    updatedAt: source.updatedAt,
  };
}

async function summarizeStudentSkills(userId) {
  const records = await StudentSkill.find({ userId })
    .select("proficiency evidenceStatus learningStatus updatedAt skillId")
    .populate("skillId", "category")
    .lean();
  const summary = {
    total: records.length,
    currentlyLearning: 0,
    demonstrated: 0,
    verified: 0,
    categories: {},
    proficiency: Object.fromEntries(Object.keys(PROFICIENCY_VALUES).map((key) => [key, 0])),
  };
  records.forEach((record) => {
    if (["learning", "practicing"].includes(record.learningStatus)) summary.currentlyLearning += 1;
    if (record.evidenceStatus === "demonstrated") summary.demonstrated += 1;
    if (record.evidenceStatus === "verified") summary.verified += 1;
    if (record.skillId?.category) {
      summary.categories[record.skillId.category] =
        (summary.categories[record.skillId.category] || 0) + 1;
    }
    summary.proficiency[record.proficiency] += 1;
  });
  return summary;
}

async function listStudentSkills(userId, query) {
  const userObjectId = new mongoose.Types.ObjectId(String(userId));
  const skillMatch = {};
  if (query.category) skillMatch["skill.category"] = query.category;
  if (query.q) {
    const escaped = query.q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    skillMatch.$or = [
      { "skill.name": new RegExp(escaped, "i") },
      { "skill.aliases": new RegExp(escaped, "i") },
    ];
  }
  const recordMatch = { userId: userObjectId };
  if (query.proficiency) recordMatch.proficiency = query.proficiency;
  if (query.evidenceStatus) recordMatch.evidenceStatus = query.evidenceStatus;
  if (query.learningStatus) recordMatch.learningStatus = query.learningStatus;

  const sort = query.sort === "name_asc"
    ? { "skill.name": 1 }
    : query.sort === "proficiency_desc"
      ? { proficiencyOrder: -1, updatedAt: -1 }
      : { updatedAt: -1 };
  const [result, summary] = await Promise.all([
    StudentSkill.aggregate([
      { $match: recordMatch },
      { $lookup: { from: "skills", localField: "skillId", foreignField: "_id", as: "skill" } },
      { $unwind: "$skill" },
      ...(Object.keys(skillMatch).length ? [{ $match: skillMatch }] : []),
      { $addFields: { proficiencyOrder: { $indexOfArray: [Object.keys(PROFICIENCY_VALUES), "$proficiency"] } } },
      { $sort: sort },
      {
        $facet: {
          metadata: [{ $count: "total" }],
          data: [{ $skip: (query.page - 1) * query.limit }, { $limit: query.limit }],
        },
      },
    ]),
    summarizeStudentSkills(userId),
  ]);
  const total = result[0]?.metadata[0]?.total || 0;
  return {
    items: (result[0]?.data || []).map(presentStudentSkill),
    summary,
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.limit)),
    },
  };
}

function assignDates(target, values) {
  ["startedAt", "lastPracticedAt", "acquiredAt"].forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(values, field)) {
      target[field] = cleanDate(values[field]);
    }
  });
}

async function syncEmbeddedSkill(profile, studentSkill, skill) {
  const identity = normalizeSkillIdentity(skill.name);
  const existing = profile.skills.find(
    (record) => normalizeSkillIdentity(record.name) === identity,
  );
  const projection = {
    name: skill.name,
    category: legacyCategory(skill.category),
    proficiency: studentSkill.proficiency,
    evidenceStatus: studentSkill.evidenceStatus,
    description: studentSkill.description || "",
    associatedProject: "",
    associatedCertification: "",
  };
  if (existing) Object.assign(existing, projection);
  else profile.skills.push(projection);
  await profile.save();
}

async function addStudentSkill(userId, values) {
  const [skill, profile] = await Promise.all([
    Skill.findOne({ _id: values.skillId, status: "active" }),
    getOrCreateStudentProfile(userId),
  ]);
  if (!skill) throw new AppError(404, "SKILL_NOT_FOUND", "Skill was not found or is inactive");
  const record = new StudentSkill({
    userId,
    studentProfileId: profile._id,
    skillId: skill._id,
    proficiency: values.proficiency,
    learningStatus: values.learningStatus,
    confidenceLevel: values.confidenceLevel ?? null,
    description: values.description,
    notes: values.notes,
  });
  assignDates(record, values);
  record.evidenceStatus = deriveEvidenceStatus(record);
  try {
    await record.save();
  } catch (error) {
    if (error?.code === 11000) {
      throw new AppError(409, "STUDENT_SKILL_DUPLICATE", "You are already tracking this skill");
    }
    throw error;
  }
  await syncEmbeddedSkill(profile, record, skill);
  record.skillId = skill;
  return presentStudentSkill(record);
}

async function findOwnedStudentSkill(userId, studentSkillId) {
  const record = await StudentSkill.findOne({ _id: studentSkillId, userId }).populate("skillId");
  if (!record) {
    throw new AppError(404, "STUDENT_SKILL_NOT_FOUND", "Tracked skill was not found");
  }
  return record;
}

async function updateStudentSkill(userId, studentSkillId, values) {
  const record = await findOwnedStudentSkill(userId, studentSkillId);
  ["proficiency", "learningStatus", "confidenceLevel", "description", "notes"].forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(values, field)) record[field] = values[field];
  });
  assignDates(record, values);
  record.evidenceStatus = deriveEvidenceStatus(record);
  await record.save();
  const profile = await getOrCreateStudentProfile(userId);
  await syncEmbeddedSkill(profile, record, record.skillId);
  return presentStudentSkill(record);
}

async function removeStudentSkill(userId, studentSkillId) {
  const record = await findOwnedStudentSkill(userId, studentSkillId);
  const skill = record.skillId;
  await StudentSkill.deleteOne({ _id: record._id, userId });
  const profile = await getOrCreateStudentProfile(userId);
  profile.skills = profile.skills.filter(
    (item) => normalizeSkillIdentity(item.name) !== normalizeSkillIdentity(skill.name),
  );
  await profile.save();
}

function profileSectionsForEvidence(type) {
  return {
    project: ["projects"],
    certification: ["certifications"],
    internship: ["experience"],
    employment: ["experience"],
    research: ["projects", "experience"],
    coursework: ["education"],
  }[type] || [];
}

function assertOwnedEvidenceReference(profile, evidenceType, referenceId) {
  if (!referenceId) return;
  const sections = profileSectionsForEvidence(evidenceType);
  if (!sections.length) {
    throw new AppError(
      400,
      "EVIDENCE_REFERENCE_UNSUPPORTED",
      "This evidence type does not support a profile record link",
    );
  }
  const owned = sections.some((section) =>
    (profile[section] || []).some((record) => String(record._id) === String(referenceId)),
  );
  if (!owned) {
    throw new AppError(
      403,
      "EVIDENCE_NOT_OWNED",
      "The linked evidence does not belong to your profile",
    );
  }
}

async function addEvidence(userId, studentSkillId, values) {
  const [record, profile] = await Promise.all([
    findOwnedStudentSkill(userId, studentSkillId),
    getOrCreateStudentProfile(userId),
  ]);
  assertOwnedEvidenceReference(profile, values.evidenceType, values.referenceId);
  record.evidenceReferences.push({
    evidenceType: values.evidenceType,
    referenceId: values.referenceId || null,
    description: values.description,
    externalUrl: values.externalUrl || "",
    date: cleanDate(values.date),
    ownerUserId: userId,
  });
  record.evidenceStatus = record.evidenceStatus === "verified" ? "verified" : "demonstrated";
  await record.save();
  await syncEmbeddedSkill(profile, record, record.skillId);
  return presentStudentSkill(record);
}

async function removeEvidence(userId, studentSkillId, evidenceId) {
  const record = await findOwnedStudentSkill(userId, studentSkillId);
  const evidence = record.evidenceReferences.id(evidenceId);
  if (!evidence || String(evidence.ownerUserId) !== String(userId)) {
    throw new AppError(404, "EVIDENCE_NOT_FOUND", "Evidence was not found");
  }
  evidence.deleteOne();
  record.evidenceStatus = deriveEvidenceStatus(record);
  await record.save();
  const profile = await getOrCreateStudentProfile(userId);
  await syncEmbeddedSkill(profile, record, record.skillId);
  return presentStudentSkill(record);
}

async function profileSkillProjection(userId) {
  const records = await StudentSkill.find({ userId }).populate("skillId").lean();
  return records.filter((record) => record.skillId).map((record) => ({
    id: String(record._id),
    name: record.skillId.name,
    category: legacyCategory(record.skillId.category),
    proficiency: record.proficiency,
    evidenceStatus: record.evidenceStatus,
    description: record.description || "",
    associatedProject: "",
    associatedCertification: "",
  }));
}

module.exports = {
  addEvidence,
  addStudentSkill,
  assertOwnedEvidenceReference,
  deriveEvidenceStatus,
  findOwnedStudentSkill,
  listStudentSkills,
  presentStudentSkill,
  profileSkillProjection,
  removeEvidence,
  removeStudentSkill,
  summarizeStudentSkills,
  syncEmbeddedSkill,
  updateStudentSkill,
};
