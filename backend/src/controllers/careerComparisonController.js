const {
  createComparison,
  deleteComparison,
  getComparison,
  listComparisons,
  updateComparison,
} = require("../services/careerComparisonService");
const { analyzeCareerComparison } = require("../services/careerDecisionAnalysisService");
const {
  comparisonAnalyzeSchema,
  comparisonCreateSchema,
  comparisonListQuerySchema,
  comparisonUpdateSchema,
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
  const values = validated(comparisonCreateSchema, request.body, response);
  if (!values) return response;
  try {
    return response.status(201).json({ success: true, message: "Career comparison saved", comparison: await createComparison(request.auth.userId, values) });
  } catch (error) { return next(error); }
}

async function list(request, response, next) {
  const query = validated(comparisonListQuerySchema, request.query, response);
  if (!query) return response;
  try { return response.status(200).json({ success: true, ...(await listComparisons(request.auth.userId, query)) }); }
  catch (error) { return next(error); }
}

async function detail(request, response, next) {
  const comparisonId = validated(objectId, request.params.comparisonId, response);
  if (!comparisonId) return response;
  try { return response.status(200).json({ success: true, comparison: await getComparison(request.auth.userId, comparisonId, { withAnalysis: true }) }); }
  catch (error) { return next(error); }
}

async function update(request, response, next) {
  const comparisonId = validated(objectId, request.params.comparisonId, response);
  const values = validated(comparisonUpdateSchema, request.body, response);
  if (!comparisonId || !values) return response;
  try { return response.status(200).json({ success: true, message: "Career comparison updated", comparison: await updateComparison(request.auth.userId, comparisonId, values) }); }
  catch (error) { return next(error); }
}

async function remove(request, response, next) {
  const comparisonId = validated(objectId, request.params.comparisonId, response);
  if (!comparisonId) return response;
  try {
    await deleteComparison(request.auth.userId, comparisonId);
    return response.status(200).json({ success: true, message: "Career comparison deleted" });
  } catch (error) { return next(error); }
}

async function analyze(request, response, next) {
  const values = validated(comparisonAnalyzeSchema, request.body, response);
  if (!values) return response;
  try { return response.status(200).json({ success: true, analysis: await analyzeCareerComparison(request.auth.userId, values.careerIds) }); }
  catch (error) { return next(error); }
}

module.exports = { analyze, create, detail, list, remove, update };
