const mongoose = require("mongoose");
const CareerRoadmap = require("../models/CareerRoadmap");
const AppError = require("../utils/AppError");
const { generateRoadmapPlan, STAGE_DEFINITIONS } = require("./roadmapGenerationService");

const ROADMAP_POPULATE = [
  { path: "targetCareerId", select: "title slug shortDescription industry careerCategory status" },
  { path: "stages.tasks.relatedSkillIds", select: "name slug category difficultyLevel" },
  { path: "stages.tasks.prerequisiteSkillIds", select: "name slug category" },
  { path: "stages.tasks.linkedResourceIds", select: "title provider resourceType externalUrl difficulty duration priceType certificateAvailable status" },
];

function idOf(value) {
  return String(value?._id || value);
}

function taskList(roadmap, { includeRetired = false } = {}) {
  return (roadmap.stages || []).flatMap((stage) => (stage.tasks || []).map((task) => ({ task, stage })))
    .filter(({ task }) => includeRetired || !task.retired);
}

function calculateRoadmapProgress(roadmap) {
  const active = taskList(roadmap);
  const completedIds = new Set(active.filter(({ task }) => task.status === "completed").map(({ task }) => idOf(task)));
  const completed = active.filter(({ task }) => task.status === "completed").length;
  const inProgress = active.filter(({ task }) => task.status === "in_progress").length;
  const total = active.length;
  const remainingHours = active.filter(({ task }) => task.status !== "completed")
    .reduce((sum, { task }) => sum + Number(task.estimatedHours || 0), 0);
  const stageProgress = (roadmap.stages || []).map((stage) => {
    const tasks = (stage.tasks || []).filter((task) => !task.retired);
    const requiredTasks = tasks.filter((task) => task.required);
    const stageCompleted = tasks.filter((task) => task.status === "completed").length;
    const allRequiredComplete = requiredTasks.length
      ? requiredTasks.every((task) => task.status === "completed")
      : tasks.length > 0 && tasks.every((task) => task.status === "completed");
    return {
      stageKey: stage.stageKey,
      title: stage.title,
      totalTasks: tasks.length,
      requiredTasks: requiredTasks.length,
      completedTasks: stageCompleted,
      completionPercentage: tasks.length ? Math.round((stageCompleted / tasks.length) * 100) : 0,
      status: !tasks.length ? "not_started"
        : allRequiredComplete ? "completed"
          : tasks.some((task) => task.status !== "not_started") ? "in_progress" : "not_started",
    };
  });
  const nextTasks = active.filter(({ task }) => task.status !== "completed" && (task.dependsOnTaskIds || [])
    .every((dependencyId) => completedIds.has(idOf(dependencyId))))
    .sort((left, right) => left.stage.displayOrder - right.stage.displayOrder || left.task.displayOrder - right.task.displayOrder)
    .slice(0, 3)
    .map(({ task, stage }) => ({ taskId: idOf(task), title: task.title, stageKey: stage.stageKey }));
  const weeklyHours = Number(roadmap.weeklyLearningHours || 1);
  const estimatedWeeksRemaining = remainingHours ? Number((remainingHours / weeklyHours).toFixed(1)) : 0;
  const estimatedCompletionDate = remainingHours
    ? new Date(Date.now() + estimatedWeeksRemaining * 7 * 24 * 60 * 60 * 1000)
    : new Date();
  let targetPlan = null;
  if (roadmap.targetDate) {
    const targetTime = new Date(roadmap.targetDate).getTime();
    const weeksAvailable = Math.max(0, (targetTime - Date.now()) / (7 * 24 * 60 * 60 * 1000));
    const requiredWeeklyHours = weeksAvailable > 0 ? Number((remainingHours / weeksAvailable).toFixed(1)) : null;
    targetPlan = {
      targetDate: roadmap.targetDate,
      weeksAvailable: Number(weeksAvailable.toFixed(1)),
      requiredWeeklyHours,
      status: total === 0 ? "no_tasks"
        : completed === total ? "completed"
        : weeksAvailable === 0 ? "target_passed"
          : requiredWeeklyHours <= weeklyHours ? "within_current_capacity" : "capacity_gap",
      note: "Target-date capacity compares estimated remaining task hours with calendar time and is not a completion guarantee.",
    };
  }
  return {
    totalTasks: total,
    completedTasks: completed,
    inProgressTasks: inProgress,
    remainingTasks: Math.max(0, total - completed - inProgress),
    completionPercentage: total ? Math.round((completed / total) * 100) : 0,
    remainingHours,
    estimatedWeeksRemaining,
    estimatedCompletionDate,
    targetPlan,
    estimateNote: "Remaining time divides incomplete task estimates by weekly learning hours. It is a planning estimate, not a completion guarantee.",
    stageProgress,
    nextTasks,
  };
}

function presentReference(value) {
  if (!value) return null;
  if (typeof value === "string") return { id: value };
  if (value instanceof mongoose.Types.ObjectId) return { id: String(value) };
  if (!value._id) return { id: String(value) };
  const plain = value.toObject ? value.toObject() : value;
  const { _id, ...rest } = plain;
  return { id: String(_id), ...rest };
}

function presentTask(task) {
  const value = task.toObject ? task.toObject() : task;
  return {
    id: idOf(value),
    stableKey: value.stableKey,
    taskType: value.taskType,
    title: value.title,
    description: value.description,
    relatedSkills: (value.relatedSkillIds || []).map(presentReference),
    prerequisites: (value.prerequisiteSkillIds || []).map(presentReference),
    dependsOnTaskIds: (value.dependsOnTaskIds || []).map(idOf),
    linkedResources: (value.linkedResourceIds || []).map(presentReference),
    targetProficiency: value.targetProficiency || null,
    estimatedHours: value.estimatedHours,
    status: value.status,
    required: value.required,
    displayOrder: value.displayOrder,
    completedAt: value.completedAt || null,
    retired: Boolean(value.retired),
    retirementReason: value.retirementReason || "",
  };
}

function presentRoadmap(roadmap, { includeRetired = true } = {}) {
  const value = roadmap.toObject ? roadmap.toObject() : roadmap;
  return {
    id: idOf(value),
    name: value.name,
    targetCareer: presentReference(value.targetCareerId),
    weeklyLearningHours: value.weeklyLearningHours,
    targetDate: value.targetDate || null,
    status: value.status,
    generationNotes: value.generationNotes || [],
    methodology: value.methodology || "",
    stages: (value.stages || []).map((stage) => ({
      stageKey: stage.stageKey,
      title: stage.title,
      description: stage.description,
      displayOrder: stage.displayOrder,
      tasks: (stage.tasks || []).filter((task) => includeRetired || !task.retired).map(presentTask),
    })),
    progress: calculateRoadmapProgress(value),
    pendingRefresh: value.pendingRefresh ? value.pendingRefresh.proposal : null,
    refreshedAt: value.refreshedAt || null,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  };
}

async function ownedRoadmap(userId, roadmapId, { populate = false } = {}) {
  let query = CareerRoadmap.findOne({ _id: roadmapId, userId });
  if (populate) query = query.populate(ROADMAP_POPULATE);
  const roadmap = await query;
  if (!roadmap) throw new AppError(404, "ROADMAP_NOT_FOUND", "Roadmap not found");
  return roadmap;
}

async function createRoadmap(userId, values) {
  const generated = await generateRoadmapPlan(userId, values.targetCareerId);
  const roadmap = await CareerRoadmap.create({
    userId,
    name: values.name || `${generated.career.title} roadmap`,
    targetCareerId: generated.career._id,
    weeklyLearningHours: values.weeklyLearningHours,
    targetDate: values.targetDate ? new Date(`${values.targetDate}T00:00:00.000Z`) : null,
    stages: generated.stages,
    generationNotes: generated.generationNotes,
    methodology: generated.methodology,
    generationSnapshot: {
      profileUpdatedAt: generated.profile?.updatedAt || null,
      careerUpdatedAt: generated.career.updatedAt || null,
      generatedAt: new Date(),
    },
  });
  await roadmap.populate(ROADMAP_POPULATE);
  return presentRoadmap(roadmap);
}

async function listRoadmaps(userId, query) {
  const filter = { userId, ...(query.status ? { status: query.status } : {}) };
  const [records, total] = await Promise.all([
    CareerRoadmap.find(filter).populate("targetCareerId", "title slug shortDescription industry careerCategory status")
      .sort({ updatedAt: -1 }).skip((query.page - 1) * query.limit).limit(query.limit),
    CareerRoadmap.countDocuments(filter),
  ]);
  return {
    items: records.map((record) => presentRoadmap(record, { includeRetired: false })),
    pagination: { page: query.page, limit: query.limit, total, pages: Math.ceil(total / query.limit) },
  };
}

async function getRoadmap(userId, roadmapId) {
  return presentRoadmap(await ownedRoadmap(userId, roadmapId, { populate: true }));
}

async function updateRoadmap(userId, roadmapId, values) {
  const roadmap = await ownedRoadmap(userId, roadmapId);
  if (values.name !== undefined) roadmap.name = values.name;
  if (values.weeklyLearningHours !== undefined) roadmap.weeklyLearningHours = values.weeklyLearningHours;
  if (values.targetDate !== undefined) roadmap.targetDate = values.targetDate ? new Date(`${values.targetDate}T00:00:00.000Z`) : null;
  if (values.status !== undefined) roadmap.status = values.status;
  await roadmap.save();
  await roadmap.populate(ROADMAP_POPULATE);
  return presentRoadmap(roadmap);
}

async function deleteRoadmap(userId, roadmapId) {
  const deleted = await CareerRoadmap.findOneAndDelete({ _id: roadmapId, userId });
  if (!deleted) throw new AppError(404, "ROADMAP_NOT_FOUND", "Roadmap not found");
}

async function updateRoadmapTask(userId, roadmapId, taskId, status) {
  const roadmap = await ownedRoadmap(userId, roadmapId);
  if (roadmap.status === "archived") throw new AppError(409, "ROADMAP_ARCHIVED", "Restore the roadmap before updating its tasks");
  const entry = taskList(roadmap, { includeRetired: true }).find(({ task }) => idOf(task) === String(taskId));
  if (!entry || entry.task.retired) throw new AppError(404, "ROADMAP_TASK_NOT_FOUND", "Active roadmap task not found");
  if (status !== "not_started") {
    const incompleteDependency = (entry.task.dependsOnTaskIds || []).find((dependencyId) => {
      const dependency = taskList(roadmap, { includeRetired: true }).find(({ task }) => idOf(task) === idOf(dependencyId));
      return dependency && dependency.task.status !== "completed";
    });
    if (incompleteDependency) throw new AppError(409, "ROADMAP_PREREQUISITE_INCOMPLETE", "Complete prerequisite roadmap tasks first");
  }
  entry.task.status = status;
  entry.task.completedAt = status === "completed" ? entry.task.completedAt || new Date() : null;
  await roadmap.save();
  await roadmap.populate(ROADMAP_POPULATE);
  return presentRoadmap(roadmap);
}

function serializedTemplate(template) {
  return {
    ...template,
    relatedSkillIds: template.relatedSkillIds.map(idOf),
    prerequisiteSkillIds: template.prerequisiteSkillIds.map(idOf),
    linkedResourceIds: template.linkedResourceIds.map(idOf),
  };
}

function comparisonValue(task) {
  return JSON.stringify({
    title: task.title,
    description: task.description,
    taskType: task.taskType,
    stageKey: task.stageKey,
    relatedSkillIds: (task.relatedSkillIds || []).map(idOf).sort(),
    prerequisiteSkillIds: (task.prerequisiteSkillIds || []).map(idOf).sort(),
    linkedResourceIds: (task.linkedResourceIds || []).map(idOf).sort(),
    dependsOnStableKeys: (task.dependsOnStableKeys || []).slice().sort(),
    targetProficiency: task.targetProficiency || "",
    estimatedHours: task.estimatedHours,
    required: task.required,
  });
}

function currentTemplate(task, stageKey, keyByTaskId) {
  return {
    stableKey: task.stableKey,
    taskType: task.taskType,
    stageKey,
    title: task.title,
    description: task.description,
    relatedSkillIds: task.relatedSkillIds || [],
    prerequisiteSkillIds: task.prerequisiteSkillIds || [],
    dependsOnStableKeys: (task.dependsOnTaskIds || []).map((id) => keyByTaskId.get(idOf(id))).filter(Boolean),
    linkedResourceIds: task.linkedResourceIds || [],
    targetProficiency: task.targetProficiency || "",
    estimatedHours: task.estimatedHours,
    required: task.required,
  };
}

function taskSummary(task) {
  return { stableKey: task.stableKey, title: task.title, stageKey: task.stageKey, estimatedHours: task.estimatedHours };
}

async function proposeRoadmapRefresh(userId, roadmapId) {
  const roadmap = await ownedRoadmap(userId, roadmapId);
  if (roadmap.status === "archived") throw new AppError(409, "ROADMAP_ARCHIVED", "Restore the roadmap before refreshing it");
  const generated = await generateRoadmapPlan(userId, roadmap.targetCareerId);
  const existingEntries = taskList(roadmap).map(({ task, stage }) => ({ task, stageKey: stage.stageKey }));
  const keyByTaskId = new Map(existingEntries.map(({ task }) => [idOf(task), task.stableKey]));
  const currentByKey = new Map(existingEntries.map(({ task, stageKey }) => [task.stableKey, currentTemplate(task, stageKey, keyByTaskId)]));
  const freshByKey = new Map(generated.templates.map((task) => [task.stableKey, task]));
  const additions = generated.templates.filter((task) => !currentByKey.has(task.stableKey)).map(taskSummary);
  const removals = [...currentByKey.values()].filter((task) => !freshByKey.has(task.stableKey)).map(taskSummary);
  const changes = generated.templates.filter((task) => currentByKey.has(task.stableKey) && comparisonValue(task) !== comparisonValue(currentByKey.get(task.stableKey)))
    .map((task) => ({ ...taskSummary(task), previousTitle: currentByKey.get(task.stableKey).title }));
  const proposal = {
    additions,
    removals,
    changes,
    unchangedCount: generated.templates.length - additions.length - changes.length,
    completedTasksProtected: existingEntries.filter(({ task }) => task.status === "completed").length,
    generatedAt: new Date(),
    notes: generated.generationNotes,
  };
  roadmap.pendingRefresh = {
    proposal,
    templates: generated.templates.map(serializedTemplate),
    generationNotes: generated.generationNotes,
    methodology: generated.methodology,
    profileUpdatedAt: generated.profile?.updatedAt || null,
    careerUpdatedAt: generated.career.updatedAt || null,
  };
  roadmap.markModified("pendingRefresh");
  await roadmap.save();
  return proposal;
}

function freshTaskObject(template, id, idByKey, existing) {
  return {
    _id: id,
    stableKey: template.stableKey,
    taskType: template.taskType,
    title: template.title,
    description: template.description,
    relatedSkillIds: template.relatedSkillIds,
    prerequisiteSkillIds: template.prerequisiteSkillIds,
    dependsOnTaskIds: template.dependsOnStableKeys.map((key) => idByKey.get(key)).filter(Boolean),
    linkedResourceIds: template.linkedResourceIds,
    targetProficiency: template.targetProficiency,
    estimatedHours: template.estimatedHours,
    status: existing?.status || "not_started",
    required: template.required,
    createdFrom: existing?.createdFrom || "refresh",
    completedAt: existing?.completedAt || null,
    retired: false,
    retiredAt: null,
    retirementReason: "",
  };
}

async function confirmRoadmapRefresh(userId, roadmapId) {
  const roadmap = await ownedRoadmap(userId, roadmapId);
  if (!roadmap.pendingRefresh?.templates) throw new AppError(409, "ROADMAP_REFRESH_MISSING", "Generate a refresh proposal before confirming it");
  const templates = roadmap.pendingRefresh.templates;
  const existingEntries = taskList(roadmap, { includeRetired: true }).map(({ task, stage }) => ({ task, stageKey: stage.stageKey }));
  const existingByKey = new Map(existingEntries.filter(({ task }) => !task.retired).map(({ task }) => [task.stableKey, task]));
  const freshKeys = new Set(templates.map((task) => task.stableKey));
  const idByKey = new Map(templates.map((task) => [task.stableKey, existingByKey.get(task.stableKey)?._id || new mongoose.Types.ObjectId()]));
  const stages = STAGE_DEFINITIONS.map((stage) => ({ ...stage, tasks: [] }));
  const stageByKey = new Map(stages.map((stage) => [stage.stageKey, stage]));
  templates.forEach((template) => {
    const existing = existingByKey.get(template.stableKey);
    const task = existing?.status === "completed"
      ? { ...existing.toObject(), retired: false, retiredAt: null, retirementReason: "" }
      : freshTaskObject(template, idByKey.get(template.stableKey), idByKey, existing);
    stageByKey.get(template.stageKey).tasks.push(task);
  });
  existingEntries.filter(({ task }) => task.retired || !freshKeys.has(task.stableKey)).forEach(({ task, stageKey }) => {
    const retired = task.toObject();
    retired.retired = true;
    retired.retiredAt = retired.retiredAt || new Date();
    retired.retirementReason = retired.retirementReason || "No longer included after a confirmed roadmap refresh";
    stageByKey.get(stageKey)?.tasks.push(retired);
  });
  stages.forEach((stage) => {
    stage.tasks.sort((left, right) => Number(left.retired) - Number(right.retired) || left.displayOrder - right.displayOrder || left.title.localeCompare(right.title));
    stage.tasks.forEach((task, index) => { if (!task.retired) task.displayOrder = index; });
  });
  roadmap.stages = stages;
  roadmap.generationNotes = roadmap.pendingRefresh.generationNotes || [];
  roadmap.methodology = roadmap.pendingRefresh.methodology || roadmap.methodology;
  roadmap.generationSnapshot = {
    profileUpdatedAt: roadmap.pendingRefresh.profileUpdatedAt || null,
    careerUpdatedAt: roadmap.pendingRefresh.careerUpdatedAt || null,
    generatedAt: new Date(),
  };
  roadmap.pendingRefresh = null;
  roadmap.refreshedAt = new Date();
  roadmap.markModified("stages");
  roadmap.markModified("pendingRefresh");
  await roadmap.save();
  await roadmap.populate(ROADMAP_POPULATE);
  return presentRoadmap(roadmap);
}

module.exports = {
  calculateRoadmapProgress,
  confirmRoadmapRefresh,
  createRoadmap,
  deleteRoadmap,
  getRoadmap,
  listRoadmaps,
  ownedRoadmap,
  presentRoadmap,
  proposeRoadmapRefresh,
  taskList,
  updateRoadmap,
  updateRoadmapTask,
};
