const { askOpportunityAssistant, getOpportunityAiStatus } = require("../services/opportunityAiService");
const { getOpportunityEligibility } = require("../services/opportunityEligibilityService");
const { findOpportunity } = require("../services/opportunityLibraryService");
const { recommendOpportunities } = require("../services/opportunityRecommendationService");
const { objectId, opportunityAiRequestSchema } = require("../validators/opportunitySchemas");
const { validateRequest } = require("../utils/validation");

function validated(schema, value, response) {
  const result = validateRequest(schema, value);
  if (!result.errors) return result.data;
  response.status(400).json({ success: false, code: "VALIDATION_ERROR", message: "Validation failed", errors: result.errors });
  return null;
}

async function recommendations(request, response, next) {
  try { return response.status(200).json({ success: true, ...(await recommendOpportunities(request.auth.userId)) }); }
  catch (error) { return next(error); }
}

async function eligibility(request, response, next) {
  const opportunityId = validated(objectId, request.params.opportunityId, response);
  if (!opportunityId) return response;
  try { return response.status(200).json({ success: true, eligibility: await getOpportunityEligibility(request.auth.userId, opportunityId) }); }
  catch (error) { return next(error); }
}

async function aiAssistant(request, response, next) {
  const opportunityId = validated(objectId, request.params.opportunityId, response);
  const values = validated(opportunityAiRequestSchema, request.body, response);
  if (!opportunityId || !values) return response;
  try { return response.status(200).json({ success: true, result: await askOpportunityAssistant(request.auth.userId, opportunityId, values) }); }
  catch (error) { return next(error); }
}

function aiStatus(_request, response) {
  return response.status(200).json({ success: true, ...getOpportunityAiStatus() });
}

async function assertActive(request, response, next) {
  const opportunityId = validated(objectId, request.params.opportunityId, response);
  if (!opportunityId) return response;
  try { await findOpportunity(opportunityId); return next(); }
  catch (error) { return next(error); }
}

module.exports = { aiAssistant, aiStatus, assertActive, eligibility, recommendations };
