const CareerRoadmap = require("../models/CareerRoadmap");
const StudentApplication = require("../models/StudentApplication");
const StudentCareer = require("../models/StudentCareer");
const StudentLearningResource = require("../models/StudentLearningResource");
const StudentProfile = require("../models/StudentProfile");
const StudentSkill = require("../models/StudentSkill");
const { calculateRoadmapProgress } = require("./roadmapService");

function idOf(value) { return String(value?._id || value); }
function validDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}
function objectIdDate(value) {
  const hex = String(value?._id || value || "");
  if (!/^[a-f\d]{24}$/i.test(hex)) return null;
  return new Date(Number.parseInt(hex.slice(0, 8), 16) * 1000);
}
function recordDate(record, fallback = null) {
  return validDate(record?.createdAt) || objectIdDate(record) || validDate(fallback);
}
function evidenceSupported(skill) {
  return Boolean((skill.evidenceReferences || []).length || ["demonstrated", "verified"].includes(skill.evidenceStatus));
}
function activity({ id, type, title, description, date, module, href, referenceId }) {
  const parsed = validDate(date);
  return parsed ? { id, type, title, description, date: parsed, module, href, referenceId: referenceId ? String(referenceId) : null } : null;
}

function roadmapSummary(roadmaps) {
  const items = (roadmaps || []).map((roadmap) => {
    const progress = calculateRoadmapProgress(roadmap);
    return {
      id: idOf(roadmap), name: roadmap.name, status: roadmap.status,
      targetCareer: roadmap.targetCareerId?.title ? { id: idOf(roadmap.targetCareerId), title: roadmap.targetCareerId.title } : null,
      ...progress,
    };
  });
  const totalTasks = items.reduce((sum, item) => sum + item.totalTasks, 0);
  const completedTasks = items.reduce((sum, item) => sum + item.completedTasks, 0);
  return {
    totalRoadmaps: items.length,
    totalTasks,
    completedTasks,
    completionPercentage: totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 0,
    items,
  };
}

function buildTimeline(data) {
  const events = [];
  (data.skills || []).forEach((skill) => {
    const name = skill.skillId?.name || "Skill";
    events.push(activity({ id: `skill:${idOf(skill)}:added`, type: "skill_added", title: `${name} added`, description: `${skill.proficiency} proficiency · ${skill.evidenceStatus.replaceAll("_", " ")} evidence status`, date: skill.createdAt, module: "skills", href: "/dashboard/skills", referenceId: skill.skillId?._id || skill.skillId }));
    const created = validDate(skill.createdAt); const updated = validDate(skill.updatedAt);
    if (created && updated && updated.getTime() - created.getTime() > 1000) events.push(activity({ id: `skill:${idOf(skill)}:updated`, type: "skill_updated", title: `${name} updated`, description: `Current proficiency is ${skill.proficiency}; learning status is ${skill.learningStatus.replaceAll("_", " ")}.`, date: updated, module: "skills", href: "/dashboard/skills", referenceId: skill.skillId?._id || skill.skillId }));
    (skill.evidenceReferences || []).forEach((evidence) => events.push(activity({ id: `evidence:${idOf(evidence)}`, type: "evidence_added", title: `Evidence added for ${name}`, description: evidence.description || `${evidence.evidenceType.replaceAll("_", " ")} evidence recorded.`, date: evidence.createdAt || evidence.date, module: "skills", href: "/dashboard/skills", referenceId: skill.skillId?._id || skill.skillId })));
  });
  (data.profile?.projects || []).forEach((project) => events.push(activity({ id: `project:${idOf(project)}`, type: "project_added", title: `Project added: ${project.title}`, description: project.description || project.role || "Project recorded in the student profile.", date: recordDate(project, data.profile?.updatedAt), module: "profile", href: "/profile#projects", referenceId: project._id })));
  (data.profile?.certifications || []).forEach((certificate) => events.push(activity({ id: `certification:${idOf(certificate)}`, type: "certification_added", title: `Certification added: ${certificate.name}`, description: `${certificate.issuer}${certificate.issueDate ? ` · issued ${certificate.issueDate}` : ""}`, date: recordDate(certificate, data.profile?.updatedAt), module: "profile", href: "/profile#certifications", referenceId: certificate._id })));
  (data.learning || []).filter((item) => item.status === "completed").forEach((item) => events.push(activity({ id: `learning:${idOf(item)}:completed`, type: "learning_completed", title: `Learning completed: ${item.resourceId?.title || "Resource"}`, description: item.resourceId?.provider ? `Provided by ${item.resourceId.provider}.` : "Marked complete in My Learning.", date: item.completedAt || item.updatedAt, module: "learning", href: "/dashboard/learning?view=progress", referenceId: item.resourceId?._id || item.resourceId })));
  (data.roadmaps || []).forEach((roadmap) => {
    (roadmap.stages || []).forEach((stage) => {
      const tasks = (stage.tasks || []).filter((task) => !task.retired);
      tasks.filter((task) => task.status === "completed").forEach((task) => events.push(activity({ id: `roadmap-task:${idOf(roadmap)}:${idOf(task)}`, type: "roadmap_task_completed", title: `Roadmap task completed: ${task.title}`, description: `${stage.title} · ${roadmap.name}`, date: task.completedAt || task.updatedAt, module: "roadmaps", href: `/dashboard/roadmaps/${idOf(roadmap)}`, referenceId: task._id })));
      if (tasks.length && tasks.every((task) => task.status === "completed")) {
        const completedAt = tasks.map((task) => validDate(task.completedAt || task.updatedAt)).filter(Boolean).sort((a, b) => b - a)[0];
        events.push(activity({ id: `roadmap-stage:${idOf(roadmap)}:${stage.stageKey}`, type: "roadmap_stage_completed", title: `Roadmap stage completed: ${stage.title}`, description: roadmap.name, date: completedAt, module: "roadmaps", href: `/dashboard/roadmaps/${idOf(roadmap)}`, referenceId: roadmap._id }));
      }
    });
  });
  (data.applications || []).filter((item) => item.inTracker).forEach((item) => events.push(activity({ id: `application:${idOf(item)}:${new Date(item.statusUpdatedAt || item.updatedAt).getTime()}`, type: "application_status_updated", title: `${item.opportunityId?.title || "Opportunity"}: ${item.status.replaceAll("_", " ")}`, description: `${item.opportunityId?.organization || "Opportunity"} · status maintained by the student`, date: item.statusUpdatedAt || item.updatedAt, module: "opportunities", href: "/dashboard/opportunities?view=tracker", referenceId: item.opportunityId?._id || item.opportunityId })));
  const unique = new Map(events.filter(Boolean).map((item) => [item.id, item]));
  return [...unique.values()].sort((left, right) => new Date(right.date) - new Date(left.date));
}

function calculateAchievements(data, timeline = buildTimeline(data)) {
  const values = [];
  const firstEvent = (type) => timeline.filter((item) => item.type === type).sort((a, b) => new Date(a.date) - new Date(b.date))[0];
  function add(key, title, description, event, module) {
    if (event && !values.some((item) => item.key === key)) values.push({ key, title, description, date: event.date, module, href: event.href, referenceId: event.referenceId });
  }
  add("first-project", "First project documented", "Added the first project to the unified student profile.", firstEvent("project_added"), "profile");
  add("first-certification", "First certification documented", "Added the first professional or academic certification.", firstEvent("certification_added"), "profile");
  add("first-roadmap-stage", "First roadmap stage completed", "Completed every active task in a roadmap stage.", firstEvent("roadmap_stage_completed"), "roadmaps");
  add("first-learning-completion", "First learning resource completed", "Completed the first resource in My Learning.", firstEvent("learning_completed"), "learning");
  const evidenceEvent = firstEvent("evidence_added") || (data.skills || []).filter(evidenceSupported).sort((a, b) => new Date(a.updatedAt) - new Date(b.updatedAt))[0];
  if (evidenceEvent) add("first-supported-skill", "First skill supported by evidence", "Recorded supporting evidence for a developed skill.", evidenceEvent.type ? evidenceEvent : activity({ id: "supported-skill", type: "evidence_added", title: "Evidence-supported skill", description: "Evidence status recorded.", date: evidenceEvent.updatedAt || evidenceEvent.createdAt, module: "skills", href: "/dashboard/skills", referenceId: evidenceEvent.skillId?._id || evidenceEvent.skillId }), "skills");
  const application = (data.applications || []).filter((item) => item.inTracker).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))[0];
  if (application) add("first-opportunity-tracked", "First opportunity tracked", "Added the first opportunity to the application tracker.", activity({ id: "first-app", type: "application_status_updated", title: "Opportunity tracked", description: "", date: application.createdAt, module: "opportunities", href: "/dashboard/opportunities?view=tracker", referenceId: application.opportunityId?._id || application.opportunityId }), "opportunities");
  return values.sort((left, right) => new Date(right.date) - new Date(left.date));
}

function monthSeries(skills) {
  const counts = new Map();
  (skills || []).forEach((skill) => {
    const date = validDate(skill.createdAt); if (!date) return;
    const key = date.toISOString().slice(0, 7); counts.set(key, (counts.get(key) || 0) + 1);
  });
  let running = 0;
  return [...counts.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([month, added]) => ({ month, added, total: (running += added) }));
}

function buildInsights(data, roadmaps = roadmapSummary(data.roadmaps)) {
  const supported = (data.skills || []).filter(evidenceSupported);
  const learning = data.learning || [];
  const areas = [];
  (data.skills || []).filter((item) => !evidenceSupported(item)).slice(0, 4).forEach((item) => areas.push({ type: "skill_evidence", title: `Add evidence for ${item.skillId?.name || "a recorded skill"}`, href: "/dashboard/skills", referenceId: idOf(item.skillId) }));
  roadmaps.items.flatMap((item) => item.nextTasks.map((task) => ({ ...task, roadmap: item }))).slice(0, 4).forEach((item) => areas.push({ type: "roadmap_task", title: item.title, href: `/dashboard/roadmaps/${item.roadmap.id}`, referenceId: item.taskId }));
  const careerGoalPreparation = roadmaps.items.filter((item) => item.targetCareer).map((item) => ({ roadmapId: item.id, career: item.targetCareer, completionPercentage: item.completionPercentage, completedTasks: item.completedTasks, totalTasks: item.totalTasks, source: "roadmap" }));
  const goalCareerIds = new Set(careerGoalPreparation.map((item) => item.career.id));
  (data.savedCareers || []).filter((item) => item.careerId?.title && !goalCareerIds.has(idOf(item.careerId))).forEach((item) => careerGoalPreparation.push({ roadmapId: null, career: { id: idOf(item.careerId), title: item.careerId.title }, completionPercentage: null, completedTasks: null, totalTasks: null, source: "saved_career" }));
  return {
    skillsDevelopedOverTime: monthSeries(data.skills),
    evidence: { totalSkills: (data.skills || []).length, supportedSkills: supported.length, unsupportedSkills: (data.skills || []).length - supported.length },
    learning: { saved: learning.length, inProgress: learning.filter((item) => item.status === "in_progress").length, completed: learning.filter((item) => item.status === "completed").length },
    roadmaps,
    careerGoalPreparation,
    areasNeedingImprovement: areas.slice(0, 8),
    methodology: "These insights summarize recorded skills, evidence, learning statuses and roadmap tasks. They are not a career-readiness score.",
  };
}

async function loadProgressData(userId) {
  const [profile, skills, learning, roadmaps, applications, savedCareers] = await Promise.all([
    StudentProfile.findOne({ userId }).lean(),
    StudentSkill.find({ userId }).populate("skillId", "name slug category").sort({ updatedAt: -1 }).lean(),
    StudentLearningResource.find({ userId, $or: [{ bookmarked: true }, { inLearningLibrary: true }] }).populate("resourceId", "title provider resourceType status").sort({ updatedAt: -1 }).lean(),
    CareerRoadmap.find({ userId }).populate("targetCareerId", "title slug careerCategory industry status").sort({ updatedAt: -1 }).lean(),
    StudentApplication.find({ userId }).populate("opportunityId", "title organization opportunityType applicationDeadline status").sort({ updatedAt: -1 }).lean(),
    StudentCareer.find({ userId, savedAt: { $ne: null } }).populate("careerId", "title slug careerCategory industry status").sort({ savedAt: -1 }).lean(),
  ]);
  return { profile, skills, learning, roadmaps, applications, savedCareers };
}

async function getProgressBundle(userId) {
  const data = await loadProgressData(userId);
  const timeline = buildTimeline(data);
  const achievements = calculateAchievements(data, timeline);
  const roadmaps = roadmapSummary(data.roadmaps);
  const insights = buildInsights(data, roadmaps);
  return { data, timeline, achievements, roadmaps, insights };
}

async function getProgressOverview(userId) {
  const bundle = await getProgressBundle(userId);
  const { data, timeline, achievements, roadmaps, insights } = bundle;
  return {
    metrics: {
      skillsDeveloped: data.skills.length,
      skillsWithEvidence: data.skills.filter(evidenceSupported).length,
      projects: data.profile?.projects?.length || 0,
      certifications: data.profile?.certifications?.length || 0,
      completedLearningResources: data.learning.filter((item) => item.status === "completed").length,
      roadmapCompletion: { completedTasks: roadmaps.completedTasks, totalTasks: roadmaps.totalTasks, percentage: roadmaps.completionPercentage },
      opportunitiesTracked: data.applications.filter((item) => item.inTracker).length,
    },
    recentAchievements: achievements.slice(0, 4),
    recentActivity: timeline.slice(0, 8),
    insights,
    methodology: "Every metric is a count or completion ratio from existing Futurion records. No independent career-readiness score is calculated.",
  };
}

module.exports = {
  buildInsights,
  buildTimeline,
  calculateAchievements,
  evidenceSupported,
  getProgressBundle,
  getProgressOverview,
  loadProgressData,
  roadmapSummary,
};
