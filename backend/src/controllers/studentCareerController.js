const { recommendCareers } = require("../services/careerRecommendationService");
const {
  listCareerState, recordCareerView, saveCareer, setComparisonSelection, unsaveCareer,
} = require("../services/studentCareerService");
const { comparisonSelectionSchema, historyQuerySchema, objectId, saveCareerSchema } = require("../validators/careerSchemas");
const { validateRequest } = require("../utils/validation");

function validate(schema, value, response) {
  const result = validateRequest(schema, value);
  if (!result.errors) return result.data;
  response.status(400).json({ success: false, code: "VALIDATION_ERROR", message: "Validation failed", errors: result.errors });
  return null;
}

async function recommendations(request, response, next) {
  try { return response.status(200).json({ success: true, ...(await recommendCareers(request.auth.userId)) }); }
  catch (error) { return next(error); }
}

function stateList(type) {
  return async function list(request, response, next) {
    const query = validate(historyQuerySchema, request.query, response);
    if (!query) return response;
    try { return response.status(200).json({ success: true, ...(await listCareerState(request.auth.userId, query, type)) }); }
    catch (error) { return next(error); }
  };
}

async function save(request, response, next) {
  const careerId = validate(objectId, request.params.careerId, response);
  const values = validate(saveCareerSchema, request.body, response);
  if (!careerId || !values) return response;
  try { return response.status(201).json({ success: true, message: "Career saved", state: await saveCareer(request.auth.userId, careerId, values.selectedForComparison) }); }
  catch (error) { return next(error); }
}

async function remove(request, response, next) {
  const careerId = validate(objectId, request.params.careerId, response);
  if (!careerId) return response;
  try { return response.status(200).json({ success: true, message: "Career removed from saved careers", state: await unsaveCareer(request.auth.userId, careerId) }); }
  catch (error) { return next(error); }
}

async function view(request, response, next) {
  const careerId = validate(objectId, request.params.careerId, response);
  if (!careerId) return response;
  try { return response.status(200).json({ success: true, ...(await recordCareerView(request.auth.userId, careerId)) }); }
  catch (error) { return next(error); }
}

async function comparison(request, response, next) {
  const careerId = validate(objectId, request.params.careerId, response);
  const values = validate(comparisonSelectionSchema, request.body, response);
  if (!careerId || !values) return response;
  try { return response.status(200).json({ success: true, message: "Comparison selection updated", state: await setComparisonSelection(request.auth.userId, careerId, values.selectedForComparison) }); }
  catch (error) { return next(error); }
}

module.exports = {
  comparison,
  recentlyViewed: stateList("recent"),
  recommendations,
  remove,
  save,
  saved: stateList("saved"),
  view,
};
