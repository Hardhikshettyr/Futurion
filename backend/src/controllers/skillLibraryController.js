const {
  getSkillDependencies,
  getSkillDetails,
  listSkills,
} = require("../services/skillLibraryService");
const { getStudentDependencyView } = require("../services/skillIntelligenceService");
const { libraryQuerySchema, objectId } = require("../validators/skillSchemas");
const { validateRequest } = require("../utils/validation");

function validationFailure(response, errors) {
  return response.status(400).json({ success: false, code: "VALIDATION_ERROR", message: "Validation failed", errors });
}

function validId(value, response) {
  const validation = validateRequest(objectId, value);
  if (validation.errors) {
    validationFailure(response, validation.errors);
    return null;
  }
  return validation.data;
}

async function getSkills(request, response, next) {
  const validation = validateRequest(libraryQuerySchema, request.query);
  if (validation.errors) return validationFailure(response, validation.errors);
  try {
    const result = await listSkills(validation.data, {
      includeInactive: request.auth.user.role === "admin",
    });
    return response.status(200).json({ success: true, ...result });
  } catch (error) {
    return next(error);
  }
}

async function getSkill(request, response, next) {
  const skillId = validId(request.params.skillId, response);
  if (!skillId) return response;
  try {
    const result = await getSkillDetails(skillId);
    return response.status(200).json({ success: true, ...result });
  } catch (error) {
    return next(error);
  }
}

async function getDependencies(request, response, next) {
  const skillId = validId(request.params.skillId, response);
  if (!skillId) return response;
  try {
    const result = request.auth.user.role === "student"
      ? await getStudentDependencyView(request.auth.userId, skillId)
      : await getSkillDependencies(skillId, { activeOnly: false });
    return response.status(200).json({ success: true, ...result });
  } catch (error) {
    return next(error);
  }
}

async function getRelated(request, response, next) {
  const skillId = validId(request.params.skillId, response);
  if (!skillId) return response;
  try {
    const result = await getSkillDependencies(skillId, {
      activeOnly: request.auth.user.role !== "admin",
    });
    return response.status(200).json({
      success: true,
      skill: result.skill,
      relatedSkills: result.relatedSkills,
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = { getDependencies, getRelated, getSkill, getSkills };
