const {
  getResourceDetails,
  getResourceFilterOptions,
  listCategories,
  listResources,
} = require("../services/learningResourceService");
const { learningResourceQuerySchema, objectId } = require("../validators/learningSchemas");
const { validateRequest } = require("../utils/validation");

function validated(schema, value, response) {
  const result = validateRequest(schema, value);
  if (!result.errors) return result.data;
  response.status(400).json({ success: false, code: "VALIDATION_ERROR", message: "Validation failed", errors: result.errors });
  return null;
}

async function list(request, response, next) {
  const query = validated(learningResourceQuerySchema, request.query, response);
  if (!query) return response;
  try {
    return response.status(200).json({
      success: true,
      ...(await listResources(query, { userId: request.auth.user.role === "student" ? request.auth.userId : null })),
    });
  } catch (error) { return next(error); }
}

async function detail(request, response, next) {
  const resourceId = validated(objectId, request.params.resourceId, response);
  if (!resourceId) return response;
  try {
    return response.status(200).json({
      success: true,
      resource: await getResourceDetails(resourceId, { userId: request.auth.user.role === "student" ? request.auth.userId : null }),
    });
  } catch (error) { return next(error); }
}

async function filters(_request, response, next) {
  try { return response.status(200).json({ success: true, ...(await getResourceFilterOptions()) }); }
  catch (error) { return next(error); }
}

async function categories(_request, response, next) {
  try { return response.status(200).json({ success: true, categories: await listCategories() }); }
  catch (error) { return next(error); }
}

module.exports = { categories, detail, filters, list };
