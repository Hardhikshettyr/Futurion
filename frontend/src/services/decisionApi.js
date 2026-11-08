import { apiRequest } from "./apiClient.js";

function queryString(values = {}) {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") params.set(key, String(value));
  });
  const text = params.toString();
  return text ? `?${text}` : "";
}

const analyzeCareerComparison = (careerIds) => apiRequest("/student/career-comparisons/analyze", { method: "POST", body: { careerIds }, requiresCsrf: true });
const getCareerComparisons = (query) => apiRequest(`/student/career-comparisons${queryString(query)}`);
const getCareerComparison = (comparisonId) => apiRequest(`/student/career-comparisons/${comparisonId}`);
const createCareerComparison = (values) => apiRequest("/student/career-comparisons", { method: "POST", body: values, requiresCsrf: true });
const updateCareerComparison = (comparisonId, values) => apiRequest(`/student/career-comparisons/${comparisonId}`, { method: "PATCH", body: values, requiresCsrf: true });
const deleteCareerComparison = (comparisonId) => apiRequest(`/student/career-comparisons/${comparisonId}`, { method: "DELETE", requiresCsrf: true });
const getComparisonAiInsights = (values) => apiRequest("/student/career-comparisons/ai-insights", { method: "POST", body: values, requiresCsrf: true });

const getCareerScenarios = (query) => apiRequest(`/student/career-scenarios${queryString(query)}`);
const getCareerScenario = (scenarioId) => apiRequest(`/student/career-scenarios/${scenarioId}`);
const createCareerScenario = (values) => apiRequest("/student/career-scenarios", { method: "POST", body: values, requiresCsrf: true });
const updateCareerScenario = (scenarioId, values) => apiRequest(`/student/career-scenarios/${scenarioId}`, { method: "PATCH", body: values, requiresCsrf: true });
const deleteCareerScenario = (scenarioId) => apiRequest(`/student/career-scenarios/${scenarioId}`, { method: "DELETE", requiresCsrf: true });
const duplicateCareerScenario = (scenarioId, name) => apiRequest(`/student/career-scenarios/${scenarioId}/duplicate`, { method: "POST", body: name ? { name } : {}, requiresCsrf: true });
const analyzeCareerScenario = (scenarioId) => apiRequest(`/student/career-scenarios/${scenarioId}/analyze`, { method: "POST", body: {}, requiresCsrf: true });
const previewCareerScenario = (values) => apiRequest("/student/career-scenarios/analyze", { method: "POST", body: values, requiresCsrf: true });
const compareCareerScenarios = (scenarioIds) => apiRequest("/student/career-scenarios/compare", { method: "POST", body: { scenarioIds }, requiresCsrf: true });
const getScenarioAiInsights = (values) => apiRequest("/student/career-scenarios/ai-insights", { method: "POST", body: values, requiresCsrf: true });

export {
  analyzeCareerComparison,
  analyzeCareerScenario,
  compareCareerScenarios,
  createCareerComparison,
  createCareerScenario,
  deleteCareerComparison,
  deleteCareerScenario,
  duplicateCareerScenario,
  getCareerComparison,
  getCareerComparisons,
  getCareerScenario,
  getCareerScenarios,
  getComparisonAiInsights,
  getScenarioAiInsights,
  previewCareerScenario,
  updateCareerComparison,
  updateCareerScenario,
};
