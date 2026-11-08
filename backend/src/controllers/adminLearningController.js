const {
  createCategory,
  createResource,
  getResourceDetails,
  listCategories,
  listResources,
  updateCategory,
  updateResource,
} = require("../services/learningResourceService");
const {
  learningCategoryCreateSchema,
  learningCategoryUpdateSchema,
  learningResourceCreateSchema,
  learningResourceQuerySchema,
  learningResourceUpdateSchema,
  objectId,
} = require("../validators/learningSchemas");
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
  try { return response.status(200).json({ success: true, ...(await listResources(query, { includeInactive: true })) }); }
  catch (error) { return next(error); }
}

async function detail(request, response, next) {
  const resourceId = validated(objectId, request.params.resourceId, response);
  if (!resourceId) return response;
  try { return response.status(200).json({ success: true, resource: await getResourceDetails(resourceId, { activeOnly: false }) }); }
  catch (error) { return next(error); }
}

async function create(request, response, next) {
  const values = validated(learningResourceCreateSchema, request.body, response);
  if (!values) return response;
  try { return response.status(201).json({ success: true, message: "Learning resource created", resource: await createResource(values, request.auth.userId) }); }
  catch (error) { return next(error); }
}

async function update(request, response, next) {
  const resourceId = validated(objectId, request.params.resourceId, response);
  const values = validated(learningResourceUpdateSchema, request.body, response);
  if (!resourceId || !values) return response;
  try { return response.status(200).json({ success: true, message: "Learning resource updated", resource: await updateResource(resourceId, values) }); }
  catch (error) { return next(error); }
}

async function categories(_request, response, next) {
  try { return response.status(200).json({ success: true, categories: await listCategories({ includeInactive: true }) }); }
  catch (error) { return next(error); }
}

async function addCategory(request, response, next) {
  const values = validated(learningCategoryCreateSchema, request.body, response);
  if (!values) return response;
  try { return response.status(201).json({ success: true, message: "Learning category created", category: await createCategory(values, request.auth.userId) }); }
  catch (error) { return next(error); }
}

async function editCategory(request, response, next) {
  const categoryId = validated(objectId, request.params.categoryId, response);
  const values = validated(learningCategoryUpdateSchema, request.body, response);
  if (!categoryId || !values) return response;
  try { return response.status(200).json({ success: true, message: "Learning category updated", category: await updateCategory(categoryId, values) }); }
  catch (error) { return next(error); }
}

module.exports = { addCategory, categories, create, detail, editCategory, list, update };
