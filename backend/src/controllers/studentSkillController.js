const {
  addEvidence,
  addStudentSkill,
  listStudentSkills,
  removeEvidence,
  removeStudentSkill,
  updateStudentSkill,
} = require("../services/studentSkillService");
const {
  analyzeCompetency,
  recommendSkills,
} = require("../services/skillIntelligenceService");
const {
  competencyAnalysisSchema,
  evidenceCreateSchema,
  objectId,
  studentSkillCreateSchema,
  studentSkillQuerySchema,
  studentSkillUpdateSchema,
} = require("../validators/skillSchemas");
const { validateRequest } = require("../utils/validation");

function validationFailure(response, errors) {
  return response.status(400).json({ success: false, code: "VALIDATION_ERROR", message: "Validation failed", errors });
}

function validated(schema, value, response) {
  const validation = validateRequest(schema, value);
  if (validation.errors) {
    validationFailure(response, validation.errors);
    return null;
  }
  return validation.data;
}

async function getStudentSkills(request, response, next) {
  const query = validated(studentSkillQuerySchema, request.query, response);
  if (!query) return response;
  try {
    return response.status(200).json({ success: true, ...(await listStudentSkills(request.auth.userId, query)) });
  } catch (error) {
    return next(error);
  }
}

async function createStudentSkill(request, response, next) {
  const values = validated(studentSkillCreateSchema, request.body, response);
  if (!values) return response;
  try {
    const studentSkill = await addStudentSkill(request.auth.userId, values);
    return response.status(201).json({ success: true, message: "Skill added to your learning profile", studentSkill });
  } catch (error) {
    return next(error);
  }
}

async function patchStudentSkill(request, response, next) {
  const studentSkillId = validated(objectId, request.params.studentSkillId, response);
  const values = validated(studentSkillUpdateSchema, request.body, response);
  if (!studentSkillId || !values) return response;
  try {
    const studentSkill = await updateStudentSkill(request.auth.userId, studentSkillId, values);
    return response.status(200).json({ success: true, message: "Skill progress updated", studentSkill });
  } catch (error) {
    return next(error);
  }
}

async function deleteStudentSkill(request, response, next) {
  const studentSkillId = validated(objectId, request.params.studentSkillId, response);
  if (!studentSkillId) return response;
  try {
    await removeStudentSkill(request.auth.userId, studentSkillId);
    return response.status(200).json({ success: true, message: "Skill removed from your profile" });
  } catch (error) {
    return next(error);
  }
}

async function createEvidence(request, response, next) {
  const studentSkillId = validated(objectId, request.params.studentSkillId, response);
  const values = validated(evidenceCreateSchema, request.body, response);
  if (!studentSkillId || !values) return response;
  try {
    const studentSkill = await addEvidence(request.auth.userId, studentSkillId, values);
    return response.status(201).json({ success: true, message: "Evidence connected to this skill", studentSkill });
  } catch (error) {
    return next(error);
  }
}

async function deleteEvidence(request, response, next) {
  const studentSkillId = validated(objectId, request.params.studentSkillId, response);
  const evidenceId = validated(objectId, request.params.evidenceId, response);
  if (!studentSkillId || !evidenceId) return response;
  try {
    const studentSkill = await removeEvidence(request.auth.userId, studentSkillId, evidenceId);
    return response.status(200).json({ success: true, message: "Evidence removed", studentSkill });
  } catch (error) {
    return next(error);
  }
}

async function getRecommendations(request, response, next) {
  try {
    return response.status(200).json({ success: true, ...(await recommendSkills(request.auth.userId)) });
  } catch (error) {
    return next(error);
  }
}

async function runCompetencyAnalysis(request, response, next) {
  const values = validated(competencyAnalysisSchema, request.body, response);
  if (!values) return response;
  try {
    return response.status(200).json({ success: true, ...(await analyzeCompetency(request.auth.userId, values.requirements)) });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  createEvidence,
  createStudentSkill,
  deleteEvidence,
  deleteStudentSkill,
  getRecommendations,
  getStudentSkills,
  patchStudentSkill,
  runCompetencyAnalysis,
};
