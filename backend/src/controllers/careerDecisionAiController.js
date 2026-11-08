const { generateComparisonInsights, generateScenarioInsights } = require("../services/careerDecisionAiService");
const { comparisonAiRequestSchema, scenarioAiRequestSchema } = require("../validators/decisionSchemas");
const { validateRequest } = require("../utils/validation");

function validated(schema, value, response) {
  const result = validateRequest(schema, value);
  if (!result.errors) return result.data;
  response.status(400).json({ success: false, code: "VALIDATION_ERROR", message: "Validation failed", errors: result.errors });
  return null;
}

async function comparisonInsights(request, response, next) {
  const values = validated(comparisonAiRequestSchema, request.body, response);
  if (!values) return response;
  try { return response.status(200).json({ success: true, insights: await generateComparisonInsights(request.auth.userId, values.careerIds, values.question) }); }
  catch (error) { return next(error); }
}

async function scenarioInsights(request, response, next) {
  const values = validated(scenarioAiRequestSchema, request.body, response);
  if (!values) return response;
  try { return response.status(200).json({ success: true, insights: await generateScenarioInsights(request.auth.userId, values.scenarioIds, values.question) }); }
  catch (error) { return next(error); }
}

module.exports = { comparisonInsights, scenarioInsights };
