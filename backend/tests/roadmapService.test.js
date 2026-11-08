const mongoose = require("mongoose");
const CareerRoadmap = require("../src/models/CareerRoadmap");
const { calculateRoadmapProgress, confirmRoadmapRefresh, deleteRoadmap, presentRoadmap, updateRoadmapTask } = require("../src/services/roadmapService");

const ids = { user: new mongoose.Types.ObjectId(), roadmap: new mongoose.Types.ObjectId(), career: new mongoose.Types.ObjectId(), skill: new mongoose.Types.ObjectId() };

function makeTask(values = {}) {
  return { _id: new mongoose.Types.ObjectId(), stableKey: values.stableKey || `task:${Math.random()}`, taskType: "skill_development", title: values.title || "Learn core skill", description: "Build this skill", relatedSkillIds: [ids.skill], prerequisiteSkillIds: [], dependsOnTaskIds: values.dependsOnTaskIds || [], linkedResourceIds: [], targetProficiency: "intermediate", estimatedHours: values.estimatedHours || 8, status: values.status || "not_started", required: true, displayOrder: values.displayOrder || 0, retired: values.retired || false };
}

function documentWith(tasks) {
  const roadmap = new CareerRoadmap({ _id: ids.roadmap, userId: ids.user, targetCareerId: ids.career, name: "Roadmap", weeklyLearningHours: 4, stages: [{ stageKey: "core_skills", title: "Core", description: "Core work", displayOrder: 1, tasks }] });
  roadmap.save = jest.fn().mockResolvedValue(roadmap);
  roadmap.populate = jest.fn().mockResolvedValue(roadmap);
  return roadmap;
}

afterEach(() => jest.restoreAllMocks());

test("calculates progress and remaining time only from active task statuses", () => {
  const first = makeTask({ status: "completed", estimatedHours: 4 });
  const second = makeTask({ status: "in_progress", estimatedHours: 8, dependsOnTaskIds: [first._id], displayOrder: 1 });
  const retired = makeTask({ status: "not_started", estimatedHours: 50, retired: true, displayOrder: 2 });
  const result = calculateRoadmapProgress(documentWith([first, second, retired]));
  expect(result).toMatchObject({ totalTasks: 2, completedTasks: 1, inProgressTasks: 1, completionPercentage: 50, remainingHours: 8, estimatedWeeksRemaining: 2 });
  expect(result.stageProgress[0].status).toBe("in_progress");
});

test("presents unpopulated references as identifiers without ObjectId internals", () => {
  const presented = presentRoadmap(documentWith([makeTask()]));
  expect(presented.targetCareer).toEqual({ id: String(ids.career) });
  expect(presented.stages[0].tasks[0].relatedSkills[0]).toEqual({ id: String(ids.skill) });
});

test("enforces ownership and prerequisites when updating a task", async () => {
  const first = makeTask();
  const second = makeTask({ dependsOnTaskIds: [first._id], displayOrder: 1 });
  const roadmap = documentWith([first, second]);
  jest.spyOn(CareerRoadmap, "findOne").mockResolvedValue(roadmap);
  await expect(updateRoadmapTask(ids.user, ids.roadmap, second._id, "completed")).rejects.toMatchObject({ code: "ROADMAP_PREREQUISITE_INCOMPLETE" });
  expect(CareerRoadmap.findOne).toHaveBeenCalledWith({ _id: ids.roadmap, userId: ids.user });
});

test("all destructive lookup filters include authenticated ownership", async () => {
  jest.spyOn(CareerRoadmap, "findOneAndDelete").mockResolvedValue({ _id: ids.roadmap });
  await deleteRoadmap(ids.user, ids.roadmap);
  expect(CareerRoadmap.findOneAndDelete).toHaveBeenCalledWith({ _id: ids.roadmap, userId: ids.user });
});

test("confirmed refresh preserves completed task content and retires removed history", async () => {
  const kept = makeTask({ stableKey: "skill:kept", title: "Original completed title", status: "completed" });
  kept.completedAt = new Date();
  const removed = makeTask({ stableKey: "skill:removed", title: "Completed historical task", status: "completed", displayOrder: 1 });
  const roadmap = documentWith([kept, removed]);
  roadmap.pendingRefresh = {
    proposal: {}, generationNotes: [], methodology: "Updated method", templates: [
      { stableKey: "skill:kept", taskType: "skill_development", stageKey: "core_skills", title: "Changed title", description: "Changed", relatedSkillIds: [String(ids.skill)], prerequisiteSkillIds: [], dependsOnStableKeys: [], linkedResourceIds: [], targetProficiency: "intermediate", estimatedHours: 12, required: true },
      { stableKey: "skill:new", taskType: "skill_development", stageKey: "core_skills", title: "New task", description: "New", relatedSkillIds: [String(ids.skill)], prerequisiteSkillIds: [], dependsOnStableKeys: [], linkedResourceIds: [], targetProficiency: "advanced", estimatedHours: 10, required: true },
    ],
  };
  jest.spyOn(CareerRoadmap, "findOne").mockResolvedValue(roadmap);
  const result = await confirmRoadmapRefresh(ids.user, ids.roadmap);
  const tasks = result.stages.flatMap((stage) => stage.tasks);
  expect(tasks.find((task) => task.stableKey === "skill:kept").title).toBe("Original completed title");
  expect(tasks.find((task) => task.stableKey === "skill:removed").retired).toBe(true);
  expect(tasks.filter((task) => task.stableKey === "skill:new" && !task.retired)).toHaveLength(1);
});
