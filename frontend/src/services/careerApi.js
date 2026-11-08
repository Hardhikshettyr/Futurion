import { apiRequest } from "./apiClient.js";

function queryString(values = {}) {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") params.set(key, String(value));
  });
  const text = params.toString();
  return text ? `?${text}` : "";
}

const getCareers = (query) => apiRequest(`/careers${queryString(query)}`);
const getCareerCategories = () => apiRequest("/careers/categories");
const getCareer = (careerId) => apiRequest(`/careers/${careerId}`);
const getRelatedCareers = (careerId) => apiRequest(`/careers/${careerId}/related`);
const getCareerRecommendations = () => apiRequest("/student/careers/recommendations");
const getSavedCareers = (query) => apiRequest(`/student/careers/saved${queryString(query)}`);
const getRecentlyViewedCareers = (query) => apiRequest(`/student/careers/recently-viewed${queryString(query)}`);
const saveCareer = (careerId, selectedForComparison = false) => apiRequest(`/student/careers/${careerId}/save`, { method: "POST", body: { selectedForComparison }, requiresCsrf: true });
const removeSavedCareer = (careerId) => apiRequest(`/student/careers/${careerId}/save`, { method: "DELETE", requiresCsrf: true });
const recordCareerView = (careerId) => apiRequest(`/student/careers/${careerId}/view`, { method: "POST", requiresCsrf: true });
const setCareerComparison = (careerId, selectedForComparison) => apiRequest(`/student/careers/${careerId}/comparison`, { method: "PATCH", body: { selectedForComparison }, requiresCsrf: true });
const getCareerAiStatus = () => apiRequest("/student/careers/ai/status");
const exploreCareersWithAi = (question) => apiRequest("/student/careers/ai/explore", { method: "POST", body: { question }, requiresCsrf: true });
const analyzeCareerWithAi = (careerId) => apiRequest(`/student/careers/ai/analyze/${careerId}`, { method: "POST", body: {}, requiresCsrf: true });
const getAdminCareers = (query) => apiRequest(`/admin/careers${queryString(query)}`);
const getAdminCareer = (careerId) => apiRequest(`/admin/careers/${careerId}`);
const createCareer = (values) => apiRequest("/admin/careers", { method: "POST", body: values, requiresCsrf: true });
const updateCareer = (careerId, values) => apiRequest(`/admin/careers/${careerId}`, { method: "PATCH", body: values, requiresCsrf: true });
const setCareerStatus = (careerId, status) => apiRequest(`/admin/careers/${careerId}/status`, { method: "PATCH", body: { status }, requiresCsrf: true });
const changeCareerRelationship = (careerId, targetCareerId, remove = false) => apiRequest(`/admin/careers/${careerId}/relationships`, { method: remove ? "DELETE" : "POST", body: { targetCareerId }, requiresCsrf: true });

export {
  analyzeCareerWithAi, changeCareerRelationship, createCareer, exploreCareersWithAi,
  getAdminCareer, getAdminCareers, getCareer, getCareerAiStatus, getCareerCategories,
  getCareerRecommendations, getCareers, getRecentlyViewedCareers, getRelatedCareers,
  getSavedCareers, recordCareerView, removeSavedCareer, saveCareer, setCareerComparison,
  setCareerStatus, updateCareer,
};
