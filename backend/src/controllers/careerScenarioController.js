const {
  analyzeSavedScenario,
  analyzeScenarioPreview,
  compareSavedScenarios,
  createScenario,
  deleteScenario,
  duplicateScenario,
  getScenario,
  listScenarios,
  updateScenario,
} = require("../services/careerScenarioService");
const {
  decisionListQuerySchema,
  scenarioCompareSchema,
  scenarioCreateSchema,
  scenarioDuplicateSchema,
  scenarioUpdateSchema,
} = require("../validators/decisionSchemas");
const { objectId } = require("../validators/careerSchemas");
const { validateRequest } = require("../utils/validation");

function validated(schema, value, response) {
  const result = validateRequest(schema, value);
  if (!result.errors) return result.data;
  response.status(400).json({ success: false, code: "VALIDATION_ERROR", message: "Validation failed", errors: result.errors });
  return null;
}

async function create(request, response, next) {
  const values = validated(scenarioCreateSchema, request.body, response);
  if (!values) return response;
  try { return response.status(201).json({ success: true, message: "Career scenario saved", scenario: await createScenario(request.auth.userId, values) }); }
  catch (error) { return next(error); }
}

async function list(request, response, next) {
  const query = validated(decisionListQuerySchema, request.query, response);
  if (!query) return response;
  try { return response.status(200).json({ success: true, ...(await listScenarios(request.auth.userId, query)) }); }
  catch (error) { return next(error); }
}

async function detail(request, response, next) {
  const scenarioId = validated(objectId, request.params.scenarioId, response);
  if (!scenarioId) return response;
  try { return response.status(200).json({ success: true, scenario: await getScenario(request.auth.userId, scenarioId) }); }
  catch (error) { return next(error); }
}

async function update(request, response, next) {
  const scenarioId = validated(objectId, request.params.scenarioId, response);
  const values = validated(scenarioUpdateSchema, request.body, response);
  if (!scenarioId || !values) return response;
  try { return response.status(200).json({ success: true, message: "Career scenario updated", scenario: await updateScenario(request.auth.userId, scenarioId, values) }); }
  catch (error) { return next(error); }
}

async function remove(request, response, next) {
  const scenarioId = validated(objectId, request.params.scenarioId, response);
  if (!scenarioId) return response;
  try {
    await deleteScenario(request.auth.userId, scenarioId);
    return response.status(200).json({ success: true, message: "Career scenario deleted" });
  } catch (error) { return next(error); }
}

async function duplicate(request, response, next) {
  const scenarioId = validated(objectId, request.params.scenarioId, response);
  const values = validated(scenarioDuplicateSchema, request.body, response);
  if (!scenarioId || !values) return response;
  try { return response.status(201).json({ success: true, message: "Career scenario duplicated", scenario: await duplicateScenario(request.auth.userId, scenarioId, values.name) }); }
  catch (error) { return next(error); }
}

async function analyzeSaved(request, response, next) {
  const scenarioId = validated(objectId, request.params.scenarioId, response);
  if (!scenarioId) return response;
  try { return response.status(200).json({ success: true, analysis: await analyzeSavedScenario(request.auth.userId, scenarioId) }); }
  catch (error) { return next(error); }
}

async function analyzePreview(request, response, next) {
  const values = validated(scenarioCreateSchema, request.body, response);
  if (!values) return response;
  try { return response.status(200).json({ success: true, analysis: await analyzeScenarioPreview(request.auth.userId, values) }); }
  catch (error) { return next(error); }
}

async function compare(request, response, next) {
  const values = validated(scenarioCompareSchema, request.body, response);
  if (!values) return response;
  try { return response.status(200).json({ success: true, comparison: await compareSavedScenarios(request.auth.userId, values.scenarioIds) }); }
  catch (error) { return next(error); }
}

module.exports = { analyzePreview, analyzeSaved, compare, create, detail, duplicate, list, remove, update };
