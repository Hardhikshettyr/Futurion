import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { lazy, Suspense } from "react";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import PublicOnlyRoute from "./components/PublicOnlyRoute.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import { StudentProfileProvider } from "./context/StudentProfileContext.jsx";
import { SkillIntelligenceProvider } from "./context/SkillIntelligenceContext.jsx";

const LandingPage = lazy(() => import("./pages/LandingPage.jsx"));
const RegisterPage = lazy(() => import("./pages/RegisterPage.jsx"));
const VerifyEmailPage = lazy(() => import("./pages/VerifyEmailPage.jsx"));
const LoginPage = lazy(() => import("./pages/LoginPage.jsx"));
const ForgotPasswordPage = lazy(() => import("./pages/ForgotPasswordPage.jsx"));
const ResetPasswordPage = lazy(() => import("./pages/ResetPasswordPage.jsx"));
const DashboardPage = lazy(() => import("./pages/DashboardPage.jsx"));
const SecurityPage = lazy(() => import("./pages/SecurityPage.jsx"));
const ProfilePage = lazy(() => import("./pages/ProfilePage.jsx"));
const ProfileEditorPage = lazy(() => import("./pages/ProfileEditorPage.jsx"));
const SkillIntelligencePage = lazy(() => import("./pages/SkillIntelligencePage.jsx"));
const AdminSkillsPage = lazy(() => import("./pages/AdminSkillsPage.jsx"));
const CareerExplorerPage = lazy(() => import("./pages/CareerExplorerPage.jsx"));
const CareerDetailPage = lazy(() => import("./pages/CareerDetailPage.jsx"));
const AdminCareersPage = lazy(() => import("./pages/AdminCareersPage.jsx"));
const CareerComparisonPage = lazy(() => import("./pages/CareerComparisonPage.jsx"));
const CareerSimulatorPage = lazy(() => import("./pages/CareerSimulatorPage.jsx"));
const LearningExplorerPage = lazy(() => import("./pages/LearningExplorerPage.jsx"));
const LearningResourceDetailPage = lazy(() => import("./pages/LearningResourceDetailPage.jsx"));
const AdminLearningPage = lazy(() => import("./pages/AdminLearningPage.jsx"));
const RoadmapsPage = lazy(() => import("./pages/RoadmapsPage.jsx"));
const RoadmapDetailPage = lazy(() => import("./pages/RoadmapDetailPage.jsx"));
const OpportunitiesPage = lazy(() => import("./pages/OpportunitiesPage.jsx"));
const OpportunityDetailPage = lazy(() => import("./pages/OpportunityDetailPage.jsx"));
const AdminOpportunitiesPage = lazy(() => import("./pages/AdminOpportunitiesPage.jsx"));
const ProgressDashboardPage = lazy(() => import("./pages/ProgressDashboardPage.jsx"));
const PortfolioPage = lazy(() => import("./pages/PortfolioPage.jsx"));
const PublicPortfolioPage = lazy(() => import("./pages/PublicPortfolioPage.jsx"));

function RouteLoader({ children }) {
  return <Suspense fallback={<div className="grid min-h-screen place-items-center bg-[#f7f6f0] text-sm font-bold text-[#5f666b]">Opening your workspace…</div>}>{children}</Suspense>;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <StudentProfileProvider>
          <SkillIntelligenceProvider>
          <Routes>
          <Route path="/" element={<RouteLoader><LandingPage /></RouteLoader>} />
          <Route path="/register" element={<PublicOnlyRoute><RouteLoader><RegisterPage /></RouteLoader></PublicOnlyRoute>} />
          <Route path="/verify-email" element={<RouteLoader><VerifyEmailPage /></RouteLoader>} />
          <Route path="/login" element={<PublicOnlyRoute><RouteLoader><LoginPage /></RouteLoader></PublicOnlyRoute>} />
          <Route path="/forgot-password" element={<RouteLoader><ForgotPasswordPage /></RouteLoader>} />
          <Route path="/reset-password" element={<RouteLoader><ResetPasswordPage /></RouteLoader>} />
          <Route path="/portfolio/:publicSlug" element={<RouteLoader><PublicPortfolioPage /></RouteLoader>} />
          <Route
            path="/dashboard"
            element={<ProtectedRoute roles={["student", "admin"]}><RouteLoader><DashboardPage /></RouteLoader></ProtectedRoute>}
          />
          <Route
            path="/settings/security"
            element={<ProtectedRoute roles={["student", "admin"]}><RouteLoader><SecurityPage /></RouteLoader></ProtectedRoute>}
          />
          <Route
            path="/profile"
            element={<ProtectedRoute roles={["student"]}><RouteLoader><ProfilePage /></RouteLoader></ProtectedRoute>}
          />
          <Route
            path="/profile/edit"
            element={<ProtectedRoute roles={["student"]}><RouteLoader><ProfileEditorPage /></RouteLoader></ProtectedRoute>}
          />
          <Route
            path="/dashboard/skills"
            element={<ProtectedRoute roles={["student"]}><RouteLoader><SkillIntelligencePage /></RouteLoader></ProtectedRoute>}
          />
          <Route
            path="/admin/skills"
            element={<ProtectedRoute roles={["admin"]}><RouteLoader><AdminSkillsPage /></RouteLoader></ProtectedRoute>}
          />
          <Route
            path="/dashboard/careers"
            element={<ProtectedRoute roles={["student"]}><RouteLoader><CareerExplorerPage /></RouteLoader></ProtectedRoute>}
          />
          <Route
            path="/dashboard/careers/:careerId"
            element={<ProtectedRoute roles={["student"]}><RouteLoader><CareerDetailPage /></RouteLoader></ProtectedRoute>}
          />
          <Route
            path="/admin/careers"
            element={<ProtectedRoute roles={["admin"]}><RouteLoader><AdminCareersPage /></RouteLoader></ProtectedRoute>}
          />
          <Route
            path="/dashboard/career-comparison"
            element={<ProtectedRoute roles={["student"]}><RouteLoader><CareerComparisonPage /></RouteLoader></ProtectedRoute>}
          />
          <Route
            path="/dashboard/career-simulator"
            element={<ProtectedRoute roles={["student"]}><RouteLoader><CareerSimulatorPage /></RouteLoader></ProtectedRoute>}
          />
          <Route
            path="/dashboard/learning"
            element={<ProtectedRoute roles={["student"]}><RouteLoader><LearningExplorerPage /></RouteLoader></ProtectedRoute>}
          />
          <Route
            path="/dashboard/learning/:resourceId"
            element={<ProtectedRoute roles={["student"]}><RouteLoader><LearningResourceDetailPage /></RouteLoader></ProtectedRoute>}
          />
          <Route
            path="/admin/learning"
            element={<ProtectedRoute roles={["admin"]}><RouteLoader><AdminLearningPage /></RouteLoader></ProtectedRoute>}
          />
          <Route
            path="/dashboard/roadmaps"
            element={<ProtectedRoute roles={["student"]}><RouteLoader><RoadmapsPage /></RouteLoader></ProtectedRoute>}
          />
          <Route
            path="/dashboard/roadmaps/:roadmapId"
            element={<ProtectedRoute roles={["student"]}><RouteLoader><RoadmapDetailPage /></RouteLoader></ProtectedRoute>}
          />
          <Route
            path="/dashboard/opportunities"
            element={<ProtectedRoute roles={["student"]}><RouteLoader><OpportunitiesPage /></RouteLoader></ProtectedRoute>}
          />
          <Route
            path="/dashboard/opportunities/:opportunityId"
            element={<ProtectedRoute roles={["student"]}><RouteLoader><OpportunityDetailPage /></RouteLoader></ProtectedRoute>}
          />
          <Route
            path="/admin/opportunities"
            element={<ProtectedRoute roles={["admin"]}><RouteLoader><AdminOpportunitiesPage /></RouteLoader></ProtectedRoute>}
          />
          <Route
            path="/dashboard/progress"
            element={<ProtectedRoute roles={["student"]}><RouteLoader><ProgressDashboardPage /></RouteLoader></ProtectedRoute>}
          />
          <Route
            path="/dashboard/portfolio"
            element={<ProtectedRoute roles={["student"]}><RouteLoader><PortfolioPage /></RouteLoader></ProtectedRoute>}
          />
          <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          </SkillIntelligenceProvider>
        </StudentProfileProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
