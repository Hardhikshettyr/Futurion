const { getOpportunityDetails, getOpportunityFilters, listOpportunities } = require("../services/opportunityLibraryService");
const { objectId, opportunityQuerySchema } = require("../validators/opportunitySchemas");
const { validateRequest } = require("../utils/validation");

function validated(schema, value, response) {
  const result = validateRequest(schema, value);
  if (!result.errors) return result.data;
  response.status(400).json({ success: false, code: "VALIDATION_ERROR", message: "Validation failed", errors: result.errors });
  return null;
}

async function list(request, response, next) {
  const query = validated(opportunityQuerySchema, request.query, response);
  if (!query) return response;
  try { return response.status(200).json({ success: true, ...(await listOpportunities(query, { userId: request.auth.user.role === "student" ? request.auth.userId : null })) }); }
  catch (error) { return next(error); }
}

async function detail(request, response, next) {
  const opportunityId = validated(objectId, request.params.opportunityId, response);
  if (!opportunityId) return response;
  try { return response.status(200).json({ success: true, opportunity: await getOpportunityDetails(opportunityId, { userId: request.auth.user.role === "student" ? request.auth.userId : null }) }); }
  catch (error) { return next(error); }
}

async function filters(_request, response, next) {
  try { return response.status(200).json({ success: true, ...(await getOpportunityFilters()) }); }
  catch (error) { return next(error); }
}

module.exports = { detail, filters, list };
