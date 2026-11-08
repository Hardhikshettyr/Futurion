import { apiRequest } from "./apiClient.js";

function queryString(values = {}) {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") params.set(key, String(value));
  });
  const text = params.toString();
  return text ? `?${text}` : "";
}

const getRoadmaps = (query) => apiRequest(`/student/roadmaps${queryString(query)}`);
const createRoadmap = (values) => apiRequest("/student/roadmaps", { method: "POST", body: values, requiresCsrf: true });
const getRoadmap = (roadmapId) => apiRequest(`/student/roadmaps/${roadmapId}`);
const updateRoadmap = (roadmapId, values) => apiRequest(`/student/roadmaps/${roadmapId}`, { method: "PATCH", body: values, requiresCsrf: true });
const deleteRoadmap = (roadmapId) => apiRequest(`/student/roadmaps/${roadmapId}`, { method: "DELETE", requiresCsrf: true });
const updateRoadmapTask = (roadmapId, taskId, status) => apiRequest(`/student/roadmaps/${roadmapId}/tasks/${taskId}`, { method: "PATCH", body: { status }, requiresCsrf: true });
const refreshRoadmap = (roadmapId) => apiRequest(`/student/roadmaps/${roadmapId}/refresh`, { method: "POST", body: {}, requiresCsrf: true });
const confirmRoadmapRefresh = (roadmapId) => apiRequest(`/student/roadmaps/${roadmapId}/refresh/confirm`, { method: "POST", body: {}, requiresCsrf: true });
const getRoadmapAiStatus = (roadmapId) => apiRequest(`/student/roadmaps/${roadmapId}/ai-status`);
const askRoadmapAssistant = (roadmapId, values) => apiRequest(`/student/roadmaps/${roadmapId}/ai-assistant`, { method: "POST", body: values, requiresCsrf: true });

export {
  askRoadmapAssistant,
  confirmRoadmapRefresh,
  createRoadmap,
  deleteRoadmap,
  getRoadmap,
  getRoadmapAiStatus,
  getRoadmaps,
  refreshRoadmap,
  updateRoadmap,
  updateRoadmapTask,
};
