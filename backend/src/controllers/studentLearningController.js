const { askLearningAssistant, getLearningAiStatus } = require("../services/learningAiService");
const { recommendLearningResources } = require("../services/learningRecommendationService");
const {
  getLearningProgress,
  listLearningLibrary,
  removeLearningItem,
  saveLearningResource,
  updateLearningItem,
} = require("../services/studentLearningService");
const {
  learningAiRequestSchema,
  learningLibraryCreateSchema,
  learningLibraryQuerySchema,
  learningLibraryUpdateSchema,
  objectId,
} = require("../validators/learningSchemas");
const { validateRequest } = require("../utils/validation");

function validated(schema, value, response) {
  const result = validateRequest(schema, value);
  if (!result.errors) return result.data;
  response.status(400).json({ success: false, code: "VALIDATION_ERROR", message: "Validation failed", errors: result.errors });
  return null;
}

async function recommendations(request, response, next) {
  try { return response.status(200).json({ success: true, ...(await recommendLearningResources(request.auth.userId)) }); }
  catch (error) { return next(error); }
}

async function library(request, response, next) {
  const query = validated(learningLibraryQuerySchema, request.query, response);
  if (!query) return response;
  try { return response.status(200).json({ success: true, ...(await listLearningLibrary(request.auth.userId, query)) }); }
  catch (error) { return next(error); }
}

async function add(request, response, next) {
  const values = validated(learningLibraryCreateSchema, request.body, response);
  if (!values) return response;
  try { return response.status(201).json({ success: true, message: values.action === "bookmark" ? "Resource bookmarked" : "Resource added to My Learning", item: await saveLearningResource(request.auth.userId, values) }); }
  catch (error) { return next(error); }
}

async function update(request, response, next) {
  const itemId = validated(objectId, request.params.itemId, response);
  const values = validated(learningLibraryUpdateSchema, request.body, response);
  if (!itemId || !values) return response;
  try { return response.status(200).json({ success: true, message: "Learning progress updated", item: await updateLearningItem(request.auth.userId, itemId, values) }); }
  catch (error) { return next(error); }
}

async function remove(request, response, next) {
  const itemId = validated(objectId, request.params.itemId, response);
  if (!itemId) return response;
  try { await removeLearningItem(request.auth.userId, itemId); return response.status(200).json({ success: true, message: "Resource removed from My Learning" }); }
  catch (error) { return next(error); }
}

async function progress(request, response, next) {
  try { return response.status(200).json({ success: true, progress: await getLearningProgress(request.auth.userId) }); }
  catch (error) { return next(error); }
}

function aiStatus(_request, response) {
  return response.status(200).json({ success: true, ...getLearningAiStatus() });
}

async function aiAssistant(request, response, next) {
  const values = validated(learningAiRequestSchema, request.body, response);
  if (!values) return response;
  try { return response.status(200).json({ success: true, result: await askLearningAssistant(request.auth.userId, values) }); }
  catch (error) { return next(error); }
}

module.exports = { add, aiAssistant, aiStatus, library, progress, recommendations, remove, update };
