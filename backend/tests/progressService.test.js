const { buildInsights, buildTimeline, calculateAchievements, roadmapSummary } = require("../src/services/progressService");

const ids = {
  skillRecord: "507f1f77bcf86cd799440001", skill: "507f1f77bcf86cd799440002", evidence: "507f1f77bcf86cd799440003",
  project: "507f1f77bcf86cd799440004", certification: "507f1f77bcf86cd799440005", learning: "507f1f77bcf86cd799440006",
  resource: "507f1f77bcf86cd799440007", roadmap: "507f1f77bcf86cd799440008", task: "507f1f77bcf86cd799440009",
  application: "507f1f77bcf86cd799440010", opportunity: "507f1f77bcf86cd799440011", career: "507f1f77bcf86cd799440012",
};
const date = (day) => new Date(`2026-10-${String(day).padStart(2, "0")}T10:00:00.000Z`);

function fixture() {
  return {
    profile: {
      projects: [{ _id: ids.project, title: "Career Explorer", description: "Built a research tool." }],
      certifications: [{ _id: ids.certification, name: "Cloud Foundations", issuer: "Example Institute" }],
    },
    skills: [{ _id: ids.skillRecord, skillId: { _id: ids.skill, name: "JavaScript" }, proficiency: "intermediate", evidenceStatus: "demonstrated", learningStatus: "in_progress", createdAt: date(1), updatedAt: date(3), evidenceReferences: [{ _id: ids.evidence, evidenceType: "project", description: "Career Explorer", createdAt: date(2) }] }],
    learning: [{ _id: ids.learning, resourceId: { _id: ids.resource, title: "JavaScript Guide", provider: "MDN" }, status: "completed", completedAt: date(4), updatedAt: date(4) }],
    roadmaps: [{ _id: ids.roadmap, name: "Frontend roadmap", status: "active", weeklyLearningHours: 5, targetCareerId: { _id: ids.career, title: "Frontend Developer" }, stages: [{ stageKey: "foundations", title: "Foundations", displayOrder: 0, tasks: [{ _id: ids.task, stableKey: "skill:js", title: "Build JavaScript evidence", status: "completed", required: true, retired: false, estimatedHours: 5, displayOrder: 0, dependsOnTaskIds: [], completedAt: date(5), updatedAt: date(5) }] }] }],
    applications: [{ _id: ids.application, opportunityId: { _id: ids.opportunity, title: "Frontend Internship", organization: "Example Org" }, inTracker: true, status: "applied", createdAt: date(6), statusUpdatedAt: date(7), updatedAt: date(7) }],
    savedCareers: [],
  };
}

test("aggregates roadmap completion from actual active task statuses", () => {
  const result = roadmapSummary(fixture().roadmaps);
  expect(result).toMatchObject({ totalRoadmaps: 1, totalTasks: 1, completedTasks: 1, completionPercentage: 100 });
  expect(result.items[0].targetCareer.title).toBe("Frontend Developer");
});

test("builds chronological, source-linked activity without duplicate events", () => {
  const timeline = buildTimeline(fixture());
  expect(timeline.map((item) => item.type)).toEqual(expect.arrayContaining(["skill_added", "skill_updated", "evidence_added", "project_added", "certification_added", "learning_completed", "roadmap_task_completed", "roadmap_stage_completed", "application_status_updated"]));
  expect(new Set(timeline.map((item) => item.id)).size).toBe(timeline.length);
  expect(timeline[0].type).toBe("application_status_updated");
});

test("derives each achievement once from existing source records", () => {
  const data = fixture(); const timeline = buildTimeline(data); const achievements = calculateAchievements(data, timeline);
  expect(achievements.map((item) => item.key)).toEqual(expect.arrayContaining(["first-project", "first-certification", "first-roadmap-stage", "first-learning-completion", "first-supported-skill", "first-opportunity-tracked"]));
  expect(new Set(achievements.map((item) => item.key)).size).toBe(achievements.length);
});

test("reports transparent growth indicators rather than a readiness score", () => {
  const data = fixture(); const insights = buildInsights(data, roadmapSummary(data.roadmaps));
  expect(insights.evidence).toEqual({ totalSkills: 1, supportedSkills: 1, unsupportedSkills: 0 });
  expect(insights.learning.completed).toBe(1);
  expect(insights.careerGoalPreparation[0]).toMatchObject({ source: "roadmap", completionPercentage: 100 });
  expect(insights).not.toHaveProperty("readinessScore");
  expect(insights.methodology).toMatch(/not a career-readiness score/i);
});
