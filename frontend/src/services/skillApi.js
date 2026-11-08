import { apiRequest } from "./apiClient.js";

function queryString(values = {}) {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") params.set(key, value);
  });
  const text = params.toString();
  return text ? `?${text}` : "";
}

function getSkillLibrary(query) {
  return apiRequest(`/skills${queryString(query)}`);
}

function getSkillDetails(skillId) {
  return apiRequest(`/skills/${skillId}`);
}

function getSkillDependencies(skillId) {
  return apiRequest(`/skills/${skillId}/dependencies`);
}

function getStudentSkills(query) {
  return apiRequest(`/student/skills${queryString(query)}`);
}

function addStudentSkill(values) {
  return apiRequest("/student/skills", {
    method: "POST",
    body: values,
    requiresCsrf: true,
  });
}

function updateStudentSkill(studentSkillId, values) {
  return apiRequest(`/student/skills/${studentSkillId}`, {
    method: "PATCH",
    body: values,
    requiresCsrf: true,
  });
}

function removeStudentSkill(studentSkillId) {
  return apiRequest(`/student/skills/${studentSkillId}`, {
    method: "DELETE",
    requiresCsrf: true,
  });
}

function addSkillEvidence(studentSkillId, values) {
  return apiRequest(`/student/skills/${studentSkillId}/evidence`, {
    method: "POST",
    body: values,
    requiresCsrf: true,
  });
}

function removeSkillEvidence(studentSkillId, evidenceId) {
  return apiRequest(`/student/skills/${studentSkillId}/evidence/${evidenceId}`, {
    method: "DELETE",
    requiresCsrf: true,
  });
}

function getSkillRecommendations() {
  return apiRequest("/student/skills/recommendations");
}

function runCompetencyAnalysis(requirements) {
  return apiRequest("/student/skills/competency-analysis", {
    method: "POST",
    body: { requirements },
    requiresCsrf: true,
  });
}

function getSkillAiStatus() {
  return apiRequest("/student/skills/ai/status");
}

function getAiSkillAnalysis() {
  return apiRequest("/student/skills/ai/analysis");
}

function generateAiSkillAnalysis(values = {}) {
  return apiRequest("/student/skills/ai/analysis", {
    method: "POST",
    body: values,
    requiresCsrf: true,
  });
}

function getLearningStrategies(query) {
  return apiRequest(`/student/skills/ai/learning-strategies${queryString(query)}`);
}

function getLearningStrategy(strategyId) {
  return apiRequest(`/student/skills/ai/learning-strategies/${strategyId}`);
}

function generateLearningStrategy(values) {
  return apiRequest("/student/skills/ai/learning-strategies/generate", {
    method: "POST",
    body: values,
    requiresCsrf: true,
  });
}

function updateLearningStrategy(strategyId, values) {
  return apiRequest(`/student/skills/ai/learning-strategies/${strategyId}`, {
    method: "PATCH",
    body: values,
    requiresCsrf: true,
  });
}

function getCoachConversations(query) {
  return apiRequest(`/student/skills/ai/coach/conversations${queryString(query)}`);
}

function getCoachConversation(conversationId) {
  return apiRequest(`/student/skills/ai/coach/conversations/${conversationId}`);
}

function askSkillCoach(values) {
  return apiRequest("/student/skills/ai/coach", {
    method: "POST",
    body: values,
    requiresCsrf: true,
  });
}

function getSkillAssessments(query) {
  return apiRequest(`/student/skills/ai/assessments${queryString(query)}`);
}

function getSkillAssessment(assessmentId) {
  return apiRequest(`/student/skills/ai/assessments/${assessmentId}`);
}

function generateSkillAssessment(values) {
  return apiRequest("/student/skills/ai/assessments/generate", {
    method: "POST",
    body: values,
    requiresCsrf: true,
  });
}

function submitSkillAssessment(assessmentId, answers) {
  return apiRequest(`/student/skills/ai/assessments/${assessmentId}/submit`, {
    method: "POST",
    body: { answers },
    requiresCsrf: true,
  });
}

function createLibrarySkill(values) {
  return apiRequest("/admin/skills", {
    method: "POST",
    body: values,
    requiresCsrf: true,
  });
}

function updateLibrarySkill(skillId, values) {
  return apiRequest(`/admin/skills/${skillId}`, {
    method: "PATCH",
    body: values,
    requiresCsrf: true,
  });
}

function setLibrarySkillStatus(skillId, status) {
  return apiRequest(`/admin/skills/${skillId}/status`, {
    method: "PATCH",
    body: { status },
    requiresCsrf: true,
  });
}

function changeSkillRelationship(skillId, relationshipType, targetSkillId, remove = false, settings = {}) {
  return apiRequest(`/admin/skills/${skillId}/relationships`, {
    method: remove ? "DELETE" : "POST",
    body: { relationshipType, targetSkillId, ...(relationshipType === "prerequisite" && !remove ? settings : {}) },
    requiresCsrf: true,
  });
}

export {
  askSkillCoach,
  addSkillEvidence,
  addStudentSkill,
  changeSkillRelationship,
  createLibrarySkill,
  generateAiSkillAnalysis,
  generateLearningStrategy,
  generateSkillAssessment,
  getAiSkillAnalysis,
  getCoachConversation,
  getCoachConversations,
  getLearningStrategies,
  getLearningStrategy,
  getSkillAiStatus,
  getSkillAssessment,
  getSkillAssessments,
  getSkillDependencies,
  getSkillDetails,
  getSkillLibrary,
  getSkillRecommendations,
  getStudentSkills,
  removeSkillEvidence,
  removeStudentSkill,
  runCompetencyAnalysis,
  setLibrarySkillStatus,
  updateLibrarySkill,
  updateLearningStrategy,
  updateStudentSkill,
  submitSkillAssessment,
};
