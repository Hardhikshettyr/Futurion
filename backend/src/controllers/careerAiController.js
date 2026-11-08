const { getGeminiConfiguration } = require("../services/geminiClient");
const { analyzeCareerWithAi, exploreCareersWithAi } = require("../services/careerAiService");
const { careerExploreRequestSchema } = require("../validators/careerAiSchemas");
const { objectId } = require("../validators/careerSchemas");
const { validateRequest } = require("../utils/validation");

function validate(schema, value, response) {
  const result = validateRequest(schema, value);
  if (!result.errors) return result.data;
  response.status(400).json({ success: false, code: "VALIDATION_ERROR", message: "Validation failed", errors: result.errors });
  return null;
}

function status(_request, response) {
  const configuration = getGeminiConfiguration();
  return response.status(200).json({ success: true, available: configuration.available, model: configuration.available ? configuration.model : null, message: configuration.available ? "AI Career Explorer is configured" : "AI is unavailable; the ordinary Career Explorer remains available" });
}

async function explore(request, response, next) {
  const values = validate(careerExploreRequestSchema, request.body, response);
  if (!values) return response;
  try { return response.status(200).json({ success: true, result: await exploreCareersWithAi(request.auth.userId, values.question) }); }
  catch (error) { return next(error); }
}

async function analyze(request, response, next) {
  const careerId = validate(objectId, request.params.careerId, response);
  if (!careerId) return response;
  try { return response.status(200).json({ success: true, result: await analyzeCareerWithAi(request.auth.userId, careerId) }); }
  catch (error) { return next(error); }
}

module.exports = { analyze, explore, status };
