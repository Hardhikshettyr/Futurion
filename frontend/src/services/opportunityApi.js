import { apiRequest } from "./apiClient.js";

function queryString(values = {}) {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") params.set(key, String(value));
  });
  const text = params.toString();
  return text ? `?${text}` : "";
}

const getOpportunities = (query) => apiRequest(`/opportunities${queryString(query)}`);
const getOpportunity = (opportunityId) => apiRequest(`/opportunities/${opportunityId}`);
const getOpportunityFilters = () => apiRequest("/opportunities/filters");
const getOpportunityRecommendations = () => apiRequest("/student/opportunities/recommendations");
const getOpportunityEligibility = (opportunityId) => apiRequest(`/student/opportunities/${opportunityId}/eligibility`);
const getOpportunityAiStatus = () => apiRequest("/student/opportunities/ai-status");
const askOpportunityAssistant = (opportunityId, values) => apiRequest(`/student/opportunities/${opportunityId}/ai-assistant`, { method: "POST", body: values, requiresCsrf: true });
const getApplications = (query) => apiRequest(`/student/applications${queryString(query)}`);
const saveOpportunity = (opportunityId, action = "save") => apiRequest("/student/applications", { method: "POST", body: { opportunityId, action }, requiresCsrf: true });
const updateApplication = (applicationId, values) => apiRequest(`/student/applications/${applicationId}`, { method: "PATCH", body: values, requiresCsrf: true });
const removeApplication = (applicationId) => apiRequest(`/student/applications/${applicationId}`, { method: "DELETE", requiresCsrf: true });

const getAdminOpportunities = (query) => apiRequest(`/admin/opportunities${queryString(query)}`);
const getAdminOpportunity = (opportunityId) => apiRequest(`/admin/opportunities/${opportunityId}`);
const createOpportunity = (values) => apiRequest("/admin/opportunities", { method: "POST", body: values, requiresCsrf: true });
const updateOpportunity = (opportunityId, values) => apiRequest(`/admin/opportunities/${opportunityId}`, { method: "PATCH", body: values, requiresCsrf: true });
const setOpportunityStatus = (opportunityId, status) => apiRequest(`/admin/opportunities/${opportunityId}/status`, { method: "PATCH", body: { status }, requiresCsrf: true });
const deleteOpportunity = (opportunityId) => apiRequest(`/admin/opportunities/${opportunityId}`, { method: "DELETE", requiresCsrf: true });

export {
  askOpportunityAssistant, createOpportunity, deleteOpportunity, getAdminOpportunities,
  getAdminOpportunity, getApplications, getOpportunities, getOpportunity,
  getOpportunityAiStatus, getOpportunityEligibility, getOpportunityFilters,
  getOpportunityRecommendations, removeApplication, saveOpportunity,
  setOpportunityStatus, updateApplication, updateOpportunity,
};
