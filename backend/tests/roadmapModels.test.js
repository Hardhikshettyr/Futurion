const mongoose = require("mongoose");
const CareerRoadmap = require("../src/models/CareerRoadmap");

function task(stableKey) {
  return { stableKey, taskType: "skill_development", title: "Learn skill", description: "Build the recorded skill.", estimatedHours: 6, displayOrder: 0 };
}

test("validates an owned roadmap with embedded ordered stages and tasks", async () => {
  const roadmap = new CareerRoadmap({
    userId: new mongoose.Types.ObjectId(), name: "Data roadmap", targetCareerId: new mongoose.Types.ObjectId(), weeklyLearningHours: 6,
    stages: [{ stageKey: "foundations", title: "Foundations", description: "Start here", displayOrder: 0, tasks: [task("skill:one:target:beginner")] }],
  });
  await expect(roadmap.validate()).resolves.toBeUndefined();
  expect(roadmap.stages[0].tasks[0].status).toBe("not_started");
});

test("rejects duplicate active task keys and defines ownership indexes", async () => {
  const roadmap = new CareerRoadmap({
    userId: new mongoose.Types.ObjectId(), name: "Duplicate roadmap", targetCareerId: new mongoose.Types.ObjectId(),
    stages: [{ stageKey: "core_skills", title: "Core", description: "Core work", displayOrder: 1, tasks: [task("duplicate"), { ...task("duplicate"), displayOrder: 1 }] }],
  });
  await expect(roadmap.validate()).rejects.toThrow(/cannot be duplicated/i);
  expect(CareerRoadmap.schema.indexes().some(([fields]) => fields.userId === 1 && fields.status === 1)).toBe(true);
});
