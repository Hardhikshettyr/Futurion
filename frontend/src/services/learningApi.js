import { apiRequest } from "./apiClient.js";

function queryString(values = {}) {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") params.set(key, String(value));
  });
  const text = params.toString();
  return text ? `?${text}` : "";
}

const getLearningResources = (query) => apiRequest(`/learning/resources${queryString(query)}`);
const getLearningResource = (resourceId) => apiRequest(`/learning/resources/${resourceId}`);
const getLearningFilters = () => apiRequest("/learning/filters");
const getLearningRecommendations = () => apiRequest("/student/learning/recommendations");
const getMyLearning = (query) => apiRequest(`/student/learning/library${queryString(query)}`);
const getLearningProgress = () => apiRequest("/student/learning/progress");
const getLearningAiStatus = () => apiRequest("/student/learning/ai-status");
const saveLearningResource = (resourceId, action) => apiRequest("/student/learning/library", { method: "POST", body: { resourceId, action }, requiresCsrf: true });
const updateLearningItem = (itemId, values) => apiRequest(`/student/learning/library/${itemId}`, { method: "PATCH", body: values, requiresCsrf: true });
const removeLearningItem = (itemId) => apiRequest(`/student/learning/library/${itemId}`, { method: "DELETE", requiresCsrf: true });
const askLearningAssistant = (values) => apiRequest("/student/learning/ai-assistant", { method: "POST", body: values, requiresCsrf: true });

const getAdminLearningResources = (query) => apiRequest(`/admin/learning/resources${queryString(query)}`);
const createLearningResource = (values) => apiRequest("/admin/learning/resources", { method: "POST", body: values, requiresCsrf: true });
const updateLearningResource = (resourceId, values) => apiRequest(`/admin/learning/resources/${resourceId}`, { method: "PATCH", body: values, requiresCsrf: true });
const getAdminLearningCategories = () => apiRequest("/admin/learning/categories");
const createLearningCategory = (values) => apiRequest("/admin/learning/categories", { method: "POST", body: values, requiresCsrf: true });
const updateLearningCategory = (categoryId, values) => apiRequest(`/admin/learning/categories/${categoryId}`, { method: "PATCH", body: values, requiresCsrf: true });

export {
  askLearningAssistant,
  createLearningCategory,
  createLearningResource,
  getAdminLearningCategories,
  getAdminLearningResources,
  getLearningAiStatus,
  getLearningFilters,
  getLearningProgress,
  getLearningRecommendations,
  getLearningResource,
  getLearningResources,
  getMyLearning,
  removeLearningItem,
  saveLearningResource,
  updateLearningCategory,
  updateLearningItem,
  updateLearningResource,
};
