const { askRoadmapAssistant, getRoadmapAiStatus } = require("../services/roadmapAiService");
const {
  confirmRoadmapRefresh,
  createRoadmap,
  deleteRoadmap,
  getRoadmap,
  listRoadmaps,
  ownedRoadmap,
  proposeRoadmapRefresh,
  updateRoadmap,
  updateRoadmapTask,
} = require("../services/roadmapService");
const {
  objectId,
  roadmapAiRequestSchema,
  roadmapCreateSchema,
  roadmapListQuerySchema,
  roadmapRefreshConfirmSchema,
  roadmapTaskUpdateSchema,
  roadmapUpdateSchema,
} = require("../validators/roadmapSchemas");
const { validateRequest } = require("../utils/validation");

function validated(schema, value, response) {
  const result = validateRequest(schema, value);
  if (!result.errors) return result.data;
  response.status(400).json({ success: false, code: "VALIDATION_ERROR", message: "Validation failed", errors: result.errors });
  return null;
}

async function list(request, response, next) {
  const query = validated(roadmapListQuerySchema, request.query, response);
  if (!query) return response;
  try { return response.status(200).json({ success: true, ...(await listRoadmaps(request.auth.userId, query)) }); }
  catch (error) { return next(error); }
}

async function create(request, response, next) {
  const values = validated(roadmapCreateSchema, request.body, response);
  if (!values) return response;
  try { return response.status(201).json({ success: true, message: "Roadmap created", roadmap: await createRoadmap(request.auth.userId, values) }); }
  catch (error) { return next(error); }
}

async function detail(request, response, next) {
  const roadmapId = validated(objectId, request.params.roadmapId, response);
  if (!roadmapId) return response;
  try { return response.status(200).json({ success: true, roadmap: await getRoadmap(request.auth.userId, roadmapId) }); }
  catch (error) { return next(error); }
}

async function update(request, response, next) {
  const roadmapId = validated(objectId, request.params.roadmapId, response);
  const values = validated(roadmapUpdateSchema, request.body, response);
  if (!roadmapId || !values) return response;
  try { return response.status(200).json({ success: true, message: "Roadmap updated", roadmap: await updateRoadmap(request.auth.userId, roadmapId, values) }); }
  catch (error) { return next(error); }
}

async function remove(request, response, next) {
  const roadmapId = validated(objectId, request.params.roadmapId, response);
  if (!roadmapId) return response;
  try { await deleteRoadmap(request.auth.userId, roadmapId); return response.status(200).json({ success: true, message: "Roadmap deleted" }); }
  catch (error) { return next(error); }
}

async function updateTask(request, response, next) {
  const roadmapId = validated(objectId, request.params.roadmapId, response);
  const taskId = validated(objectId, request.params.taskId, response);
  const values = validated(roadmapTaskUpdateSchema, request.body, response);
  if (!roadmapId || !taskId || !values) return response;
  try { return response.status(200).json({ success: true, message: "Task status updated", roadmap: await updateRoadmapTask(request.auth.userId, roadmapId, taskId, values.status) }); }
  catch (error) { return next(error); }
}

async function refresh(request, response, next) {
  const roadmapId = validated(objectId, request.params.roadmapId, response);
  if (!roadmapId) return response;
  try { return response.status(200).json({ success: true, message: "Refresh proposal generated. Review it before confirming.", proposal: await proposeRoadmapRefresh(request.auth.userId, roadmapId) }); }
  catch (error) { return next(error); }
}

async function confirmRefresh(request, response, next) {
  const roadmapId = validated(objectId, request.params.roadmapId, response);
  const values = validated(roadmapRefreshConfirmSchema, request.body, response);
  if (!roadmapId || !values) return response;
  try { return response.status(200).json({ success: true, message: "Roadmap refresh confirmed", roadmap: await confirmRoadmapRefresh(request.auth.userId, roadmapId) }); }
  catch (error) { return next(error); }
}

async function aiStatus(request, response, next) {
  const roadmapId = validated(objectId, request.params.roadmapId, response);
  if (!roadmapId) return response;
  try {
    await ownedRoadmap(request.auth.userId, roadmapId);
    return response.status(200).json({ success: true, ...getRoadmapAiStatus() });
  } catch (error) { return next(error); }
}

async function aiAssistant(request, response, next) {
  const roadmapId = validated(objectId, request.params.roadmapId, response);
  const values = validated(roadmapAiRequestSchema, request.body, response);
  if (!roadmapId || !values) return response;
  try { return response.status(200).json({ success: true, result: await askRoadmapAssistant(request.auth.userId, roadmapId, values) }); }
  catch (error) { return next(error); }
}

module.exports = {
  aiAssistant,
  aiStatus,
  confirmRefresh,
  create,
  detail,
  list,
  refresh,
  remove,
  update,
  updateTask,
};
