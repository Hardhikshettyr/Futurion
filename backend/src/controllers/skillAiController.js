const { getGeminiConfiguration } = require("../services/geminiClient");
const {
  generateSkillAnalysis,
  getLatestAnalysis,
} = require("../services/skillAnalysisService");
const {
  generateLearningStrategy,
  getLearningStrategy,
  listLearningStrategies,
  updateLearningStrategy,
} = require("../services/learningStrategyService");
const {
  askSkillCoach,
  getCoachConversation,
  listCoachConversations,
} = require("../services/skillGapCoachService");
const {
  generateAssessment,
  getAssessment,
  listAssessments,
  submitAssessment,
} = require("../services/skillAssessmentService");
const {
  analysisRequestSchema,
  assessmentRequestSchema,
  assessmentSubmissionSchema,
  coachRequestSchema,
  historyQuerySchema,
  learningStrategyRequestSchema,
  learningStrategyUpdateSchema,
} = require("../validators/skillAiSchemas");
const { objectId } = require("../validators/skillSchemas");
const { validateRequest } = require("../utils/validation");

function validated(schema, value, response) {
  const validation = validateRequest(schema, value);
  if (validation.errors) {
    response.status(400).json({
      success: false,
      code: "VALIDATION_ERROR",
      message: "Validation failed",
      errors: validation.errors,
    });
    return null;
  }
  return validation.data;
}

function getAiStatus(_request, response) {
  const configuration = getGeminiConfiguration();
  return response.status(200).json({
    success: true,
    available: configuration.available,
    model: configuration.available ? configuration.model : null,
    message: configuration.available
      ? "AI Skill Intelligence is configured"
      : "AI features are unavailable; deterministic skill tools remain available",
  });
}

async function getAnalysis(request, response, next) {
  try {
    return response.status(200).json({
      success: true,
      analysis: await getLatestAnalysis(request.auth.userId),
    });
  } catch (error) {
    return next(error);
  }
}

async function createAnalysis(request, response, next) {
  const values = validated(analysisRequestSchema, request.body, response);
  if (!values) return response;
  try {
    return response.status(200).json({
      success: true,
      message: "Skill analysis generated",
      analysis: await generateSkillAnalysis(request.auth.userId, values),
    });
  } catch (error) {
    return next(error);
  }
}

async function createLearningStrategy(request, response, next) {
  const values = validated(learningStrategyRequestSchema, request.body, response);
  if (!values) return response;
  try {
    return response.status(201).json({
      success: true,
      message: "Learning strategy generated as a draft",
      learningStrategy: await generateLearningStrategy(request.auth.userId, values),
    });
  } catch (error) {
    return next(error);
  }
}

async function getLearningStrategies(request, response, next) {
  const query = validated(historyQuerySchema, request.query, response);
  if (!query) return response;
  try {
    return response.status(200).json({ success: true, ...(await listLearningStrategies(request.auth.userId, query)) });
  } catch (error) {
    return next(error);
  }
}

async function getOneLearningStrategy(request, response, next) {
  const strategyId = validated(objectId, request.params.strategyId, response);
  if (!strategyId) return response;
  try {
    return response.status(200).json({
      success: true,
      learningStrategy: await getLearningStrategy(request.auth.userId, strategyId),
    });
  } catch (error) {
    return next(error);
  }
}

async function patchLearningStrategy(request, response, next) {
  const strategyId = validated(objectId, request.params.strategyId, response);
  const values = validated(learningStrategyUpdateSchema, request.body, response);
  if (!strategyId || !values) return response;
  try {
    return response.status(200).json({
      success: true,
      message: values.status === "saved" ? "Learning strategy saved" : "Learning strategy updated",
      learningStrategy: await updateLearningStrategy(request.auth.userId, strategyId, values),
    });
  } catch (error) {
    return next(error);
  }
}

async function askCoach(request, response, next) {
  const values = validated(coachRequestSchema, request.body, response);
  if (!values) return response;
  try {
    return response.status(200).json({
      success: true,
      conversation: await askSkillCoach(request.auth.userId, values),
    });
  } catch (error) {
    return next(error);
  }
}

async function getCoachConversations(request, response, next) {
  const query = validated(historyQuerySchema, request.query, response);
  if (!query) return response;
  try {
    return response.status(200).json({ success: true, ...(await listCoachConversations(request.auth.userId, query)) });
  } catch (error) {
    return next(error);
  }
}

async function getOneCoachConversation(request, response, next) {
  const conversationId = validated(objectId, request.params.conversationId, response);
  if (!conversationId) return response;
  try {
    return response.status(200).json({
      success: true,
      conversation: await getCoachConversation(request.auth.userId, conversationId),
    });
  } catch (error) {
    return next(error);
  }
}

async function createAssessment(request, response, next) {
  const values = validated(assessmentRequestSchema, request.body, response);
  if (!values) return response;
  try {
    return response.status(201).json({
      success: true,
      message: "Assessment generated",
      assessment: await generateAssessment(request.auth.userId, values),
    });
  } catch (error) {
    return next(error);
  }
}

async function getAssessments(request, response, next) {
  const query = validated(historyQuerySchema, request.query, response);
  if (!query) return response;
  try {
    return response.status(200).json({ success: true, ...(await listAssessments(request.auth.userId, query)) });
  } catch (error) {
    return next(error);
  }
}

async function getOneAssessment(request, response, next) {
  const assessmentId = validated(objectId, request.params.assessmentId, response);
  if (!assessmentId) return response;
  try {
    return response.status(200).json({
      success: true,
      assessment: await getAssessment(request.auth.userId, assessmentId),
    });
  } catch (error) {
    return next(error);
  }
}

async function submitAssessmentAnswers(request, response, next) {
  const assessmentId = validated(objectId, request.params.assessmentId, response);
  const values = validated(assessmentSubmissionSchema, request.body, response);
  if (!assessmentId || !values) return response;
  try {
    return response.status(200).json({
      success: true,
      message: "Assessment submitted. Review the explanations before changing any skill record.",
      assessment: await submitAssessment(request.auth.userId, assessmentId, values.answers),
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  askCoach,
  createAnalysis,
  createAssessment,
  createLearningStrategy,
  getAiStatus,
  getAnalysis,
  getAssessments,
  getCoachConversations,
  getLearningStrategies,
  getOneAssessment,
  getOneCoachConversation,
  getOneLearningStrategy,
  patchLearningStrategy,
  submitAssessmentAnswers,
};
