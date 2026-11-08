const { listApplications, removeApplication, saveOpportunity, updateApplication } = require("../services/studentApplicationService");
const { applicationCreateSchema, applicationQuerySchema, applicationUpdateSchema, objectId } = require("../validators/opportunitySchemas");
const { validateRequest } = require("../utils/validation");

function validated(schema, value, response) {
  const result = validateRequest(schema, value);
  if (!result.errors) return result.data;
  response.status(400).json({ success: false, code: "VALIDATION_ERROR", message: "Validation failed", errors: result.errors });
  return null;
}

async function list(request, response, next) {
  const query = validated(applicationQuerySchema, request.query, response);
  if (!query) return response;
  try { return response.status(200).json({ success: true, ...(await listApplications(request.auth.userId, query)) }); }
  catch (error) { return next(error); }
}

async function create(request, response, next) {
  const values = validated(applicationCreateSchema, request.body, response);
  if (!values) return response;
  try { return response.status(201).json({ success: true, message: values.action === "track" ? "Opportunity added to application tracker" : "Opportunity saved", application: await saveOpportunity(request.auth.userId, values) }); }
  catch (error) { return next(error); }
}

async function update(request, response, next) {
  const applicationId = validated(objectId, request.params.applicationId, response);
  const values = validated(applicationUpdateSchema, request.body, response);
  if (!applicationId || !values) return response;
  try { return response.status(200).json({ success: true, message: "Application tracker updated", application: await updateApplication(request.auth.userId, applicationId, values) }); }
  catch (error) { return next(error); }
}

async function remove(request, response, next) {
  const applicationId = validated(objectId, request.params.applicationId, response);
  if (!applicationId) return response;
  try { await removeApplication(request.auth.userId, applicationId); return response.status(200).json({ success: true, message: "Opportunity removed from your tracker" }); }
  catch (error) { return next(error); }
}

module.exports = { create, list, remove, update };
