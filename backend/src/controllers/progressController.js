const { askProgressAssistant, getProgressAiStatus } = require("../services/progressAiService");
const { getProgressBundle, getProgressOverview } = require("../services/progressService");
const { progressAiRequestSchema, timelineQuerySchema } = require("../validators/progressPortfolioSchemas");
const { validateRequest } = require("../utils/validation");

function validated(schema, value, response) {
  const result = validateRequest(schema, value);
  if (!result.errors) return result.data;
  response.status(400).json({ success: false, code: "VALIDATION_ERROR", message: "Validation failed", errors: result.errors });
  return null;
}

async function overview(request, response, next) {
  try { return response.status(200).json({ success: true, overview: await getProgressOverview(request.auth.userId) }); }
  catch (error) { return next(error); }
}

async function timeline(request, response, next) {
  const query = validated(timelineQuerySchema, request.query, response); if (!query) return response;
  try {
    const bundle = await getProgressBundle(request.auth.userId);
    return response.status(200).json({ success: true, items: bundle.timeline.slice(0, query.limit), total: bundle.timeline.length });
  } catch (error) { return next(error); }
}

async function achievements(request, response, next) {
  try { const bundle = await getProgressBundle(request.auth.userId); return response.status(200).json({ success: true, items: bundle.achievements }); }
  catch (error) { return next(error); }
}

async function aiAssistant(request, response, next) {
  const values = validated(progressAiRequestSchema, request.body, response); if (!values) return response;
  try { return response.status(200).json({ success: true, result: await askProgressAssistant(request.auth.userId, values) }); }
  catch (error) { return next(error); }
}

function aiStatus(_request, response) { return response.status(200).json({ success: true, ...getProgressAiStatus() }); }

module.exports = { achievements, aiAssistant, aiStatus, overview, timeline };
