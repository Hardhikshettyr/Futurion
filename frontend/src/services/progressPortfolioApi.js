import { apiRequest } from "./apiClient.js";

const getProgressOverview = () => apiRequest("/student/progress/overview");
const getProgressTimeline = (limit = 40) => apiRequest(`/student/progress/timeline?limit=${limit}`);
const getProgressAchievements = () => apiRequest("/student/progress/achievements");
const getProgressAiStatus = () => apiRequest("/student/progress/ai-status");
const askProgressAssistant = (values) => apiRequest("/student/progress/ai-assistant", { method: "POST", body: values, requiresCsrf: true });

const getPortfolio = () => apiRequest("/student/portfolio");
const updatePortfolio = (values) => apiRequest("/student/portfolio", { method: "PATCH", body: values, requiresCsrf: true });
const publishPortfolio = (values = {}) => apiRequest("/student/portfolio/public", { method: "POST", body: values, requiresCsrf: true });
const updatePortfolioPublicSettings = (values) => apiRequest("/student/portfolio/public-settings", { method: "PATCH", body: values, requiresCsrf: true });
const getPublicPortfolio = (publicSlug) => apiRequest(`/public/portfolio/${encodeURIComponent(publicSlug)}`);

async function downloadPortfolioPdf(filename = "career-portfolio.pdf") {
  const blob = await apiRequest("/student/portfolio/pdf", { responseType: "blob" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url; anchor.download = filename; document.body.appendChild(anchor); anchor.click(); anchor.remove();
  URL.revokeObjectURL(url);
}

export {
  askProgressAssistant,
  downloadPortfolioPdf,
  getPortfolio,
  getProgressAchievements,
  getProgressAiStatus,
  getProgressOverview,
  getProgressTimeline,
  getPublicPortfolio,
  publishPortfolio,
  updatePortfolio,
  updatePortfolioPublicSettings,
};
