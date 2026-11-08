const Career = require("../models/Career");
const CareerScenario = require("../models/CareerScenario");
const Skill = require("../models/Skill");
const AppError = require("../utils/AppError");
const { analyzeCareerScenario, compareCareerScenarios, scenarioMetadata } = require("./careerDecisionAnalysisService");

function presentScenario(scenario) {
  const source = scenario.toObject ? scenario.toObject() : scenario;
  const base = scenarioMetadata(source);
  return {
    ...base,
    targetCareer: source.targetCareerId && typeof source.targetCareerId === "object" && source.targetCareerId.title
      ? {
          id: String(source.targetCareerId._id),
          title: source.targetCareerId.title,
          slug: source.targetCareerId.slug,
          industry: source.targetCareerId.industry,
          careerCategory: source.targetCareerId.careerCategory,
          status: source.targetCareerId.status,
        }
      : { id: base.targetCareerId },
  };
}

async function validateScenarioReferences(values) {
  const skillIds = (values.hypotheticalSkills || []).map((item) => String(item.skillId?._id || item.skillId));
  if (new Set(skillIds).size !== skillIds.length) {
    throw new AppError(400, "SCENARIO_SKILL_DUPLICATE", "Hypothetical skills cannot be duplicated");
  }
  const [career, skillCount] = await Promise.all([
    Career.exists({ _id: values.targetCareerId?._id || values.targetCareerId, status: "active" }),
    skillIds.length ? Skill.countDocuments({ _id: { $in: skillIds }, status: "active" }) : 0,
  ]);
  if (!career) throw new AppError(400, "SCENARIO_CAREER_INVALID", "The target career must exist and be active");
  if (skillCount !== skillIds.length) throw new AppError(400, "SCENARIO_SKILL_INVALID", "Every hypothetical skill must exist and be active");
}

function scenarioQuery(userId, scenarioId) {
  return CareerScenario.findOne({ _id: scenarioId, userId })
    .populate("targetCareerId", "title slug industry careerCategory status")
    .populate("hypotheticalSkills.skillId", "name slug category difficultyLevel status");
}

async function createScenario(userId, values) {
  await validateScenarioReferences(values);
  const scenario = await CareerScenario.create({ userId, ...values });
  return presentScenario(await scenarioQuery(userId, scenario._id));
}

async function listScenarios(userId, query) {
  const filter = { userId };
  if (query.status) filter.status = query.status;
  const skip = (query.page - 1) * query.limit;
  const [items, total] = await Promise.all([
    CareerScenario.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(query.limit)
      .populate("targetCareerId", "title slug industry careerCategory status")
      .populate("hypotheticalSkills.skillId", "name slug category difficultyLevel status").lean(),
    CareerScenario.countDocuments(filter),
  ]);
  return {
    items: items.map(presentScenario),
    pagination: { page: query.page, limit: query.limit, total, totalPages: Math.max(1, Math.ceil(total / query.limit)) },
  };
}

async function getScenarioDocument(userId, scenarioId) {
  const scenario = await CareerScenario.findOne({ _id: scenarioId, userId });
  if (!scenario) throw new AppError(404, "CAREER_SCENARIO_NOT_FOUND", "Career scenario was not found");
  return scenario;
}

async function getScenario(userId, scenarioId) {
  const scenario = await scenarioQuery(userId, scenarioId);
  if (!scenario) throw new AppError(404, "CAREER_SCENARIO_NOT_FOUND", "Career scenario was not found");
  return presentScenario(scenario);
}

async function updateScenario(userId, scenarioId, values) {
  const scenario = await getScenarioDocument(userId, scenarioId);
  const references = {
    targetCareerId: values.targetCareerId || scenario.targetCareerId,
    hypotheticalSkills: values.hypotheticalSkills || scenario.hypotheticalSkills,
  };
  await validateScenarioReferences(references);
  Object.assign(scenario, values);
  await scenario.save();
  return getScenario(userId, scenario._id);
}

async function duplicateScenario(userId, scenarioId, name) {
  const source = await getScenarioDocument(userId, scenarioId);
  const values = source.toObject();
  delete values._id;
  delete values.createdAt;
  delete values.updatedAt;
  delete values.__v;
  delete values.userId;
  values.name = (name || `${source.name} — copy`).slice(0, 120);
  values.status = "active";
  return createScenario(userId, values);
}

async function deleteScenario(userId, scenarioId) {
  const result = await CareerScenario.deleteOne({ _id: scenarioId, userId });
  if (!result.deletedCount) throw new AppError(404, "CAREER_SCENARIO_NOT_FOUND", "Career scenario was not found");
}

async function analyzeSavedScenario(userId, scenarioId) {
  const scenario = await getScenarioDocument(userId, scenarioId);
  if (scenario.status === "archived") {
    throw new AppError(409, "CAREER_SCENARIO_ARCHIVED", "Reactivate this scenario before analyzing it");
  }
  return analyzeCareerScenario(userId, scenario.toObject());
}

async function analyzeScenarioPreview(userId, values) {
  await validateScenarioReferences(values);
  return analyzeCareerScenario(userId, values);
}

async function getOwnedScenarios(userId, scenarioIds, { activeOnly = true } = {}) {
  const filter = { _id: { $in: scenarioIds }, userId };
  if (activeOnly) filter.status = "active";
  const scenarios = await CareerScenario.find(filter).lean();
  if (scenarios.length !== scenarioIds.length) {
    throw new AppError(404, "CAREER_SCENARIO_NOT_FOUND", "Every selected scenario must exist, be active, and belong to you");
  }
  const byId = new Map(scenarios.map((item) => [String(item._id), item]));
  return scenarioIds.map((id) => byId.get(String(id)));
}

async function compareSavedScenarios(userId, scenarioIds) {
  const scenarios = await getOwnedScenarios(userId, scenarioIds);
  return compareCareerScenarios(userId, scenarios);
}

module.exports = {
  analyzeSavedScenario,
  analyzeScenarioPreview,
  compareSavedScenarios,
  createScenario,
  deleteScenario,
  duplicateScenario,
  getOwnedScenarios,
  getScenario,
  getScenarioDocument,
  listScenarios,
  presentScenario,
  updateScenario,
  validateScenarioReferences,
};
