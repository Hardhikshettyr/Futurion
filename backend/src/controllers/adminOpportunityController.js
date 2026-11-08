const { createOpportunity, deleteOpportunity, getOpportunityDetails, listOpportunities, setOpportunityStatus, updateOpportunity } = require("../services/opportunityLibraryService");
const { objectId, opportunityCreateSchema, opportunityQuerySchema, opportunityStatusSchema, opportunityUpdateSchema } = require("../validators/opportunitySchemas");
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
  try { return response.status(200).json({ success: true, ...(await listOpportunities(query, { includeInactive: true })) }); }
  catch (error) { return next(error); }
}
async function detail(request, response, next) {
  const opportunityId = validated(objectId, request.params.opportunityId, response); if (!opportunityId) return response;
  try { return response.status(200).json({ success: true, opportunity: await getOpportunityDetails(opportunityId, { activeOnly: false, includeUnverifiedUrl: true }) }); }
  catch (error) { return next(error); }
}
async function create(request, response, next) {
  const values = validated(opportunityCreateSchema, request.body, response); if (!values) return response;
  try { return response.status(201).json({ success: true, message: "Opportunity created", opportunity: await createOpportunity(values, request.auth.userId) }); }
  catch (error) { return next(error); }
}
async function update(request, response, next) {
  const opportunityId = validated(objectId, request.params.opportunityId, response); const values = validated(opportunityUpdateSchema, request.body, response);
  if (!opportunityId || !values) return response;
  try { return response.status(200).json({ success: true, message: "Opportunity updated", opportunity: await updateOpportunity(opportunityId, values) }); }
  catch (error) { return next(error); }
}
async function updateStatus(request, response, next) {
  const opportunityId = validated(objectId, request.params.opportunityId, response); const values = validated(opportunityStatusSchema, request.body, response);
  if (!opportunityId || !values) return response;
  try { return response.status(200).json({ success: true, message: `Opportunity ${values.status}`, opportunity: await setOpportunityStatus(opportunityId, values.status) }); }
  catch (error) { return next(error); }
}
async function remove(request, response, next) {
  const opportunityId = validated(objectId, request.params.opportunityId, response); if (!opportunityId) return response;
  try { await deleteOpportunity(opportunityId); return response.status(200).json({ success: true, message: "Opportunity removed" }); }
  catch (error) { return next(error); }
}

module.exports = { create, detail, list, remove, update, updateStatus };
