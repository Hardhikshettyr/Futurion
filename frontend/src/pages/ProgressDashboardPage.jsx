import { useCallback, useEffect, useState } from "react";
import AchievementsPanel from "../components/progress/AchievementsPanel.jsx";
import ActivityTimeline from "../components/progress/ActivityTimeline.jsx";
import GrowthInsights from "../components/progress/GrowthInsights.jsx";
import ProgressAiPanel from "../components/progress/ProgressAiPanel.jsx";
import ProgressMetricGrid from "../components/progress/ProgressMetricGrid.jsx";
import ModuleIntroduction from "../components/ui/ModuleIntroduction.jsx";
import AppShell from "../layouts/AppShell.jsx";
import { getProgressAchievements, getProgressAiStatus, getProgressOverview, getProgressTimeline } from "../services/progressPortfolioApi.js";

function ProgressDashboardPage() {
  const [overview, setOverview] = useState(null); const [timeline, setTimeline] = useState([]); const [achievements, setAchievements] = useState([]); const [aiAvailable, setAiAvailable] = useState(false);
  const [status, setStatus] = useState({ loading: true, error: "" });
  const load = useCallback(async () => {
    setStatus({ loading: true, error: "" });
    try { const [overviewData, timelineData, achievementData, aiData] = await Promise.all([getProgressOverview(), getProgressTimeline(60), getProgressAchievements(), getProgressAiStatus()]); setOverview(overviewData.overview); setTimeline(timelineData.items || []); setAchievements(achievementData.items || []); setAiAvailable(aiData.available); }
    catch (error) { setStatus({ loading: false, error: error.message }); return; }
    setStatus({ loading: false, error: "" });
  }, []);
  useEffect(() => { load(); }, [load]);
  return <AppShell eyebrow="Student progress and career portfolio" title="Career progress">
    <ModuleIntroduction eyebrow="Understand your development" title="Career Progress" description="Track your development using the skills, learning, roadmaps, achievements and opportunity activity already recorded across Futurion." value="Use the timeline to review recent movement, inspect meaningful milestones and identify the next records that can strengthen your career story." capabilities={["Review progress across connected modules", "Follow your activity timeline and achievements", "Open the source records behind each milestone"]} action={{ to: "/dashboard/portfolio", label: "Build my career portfolio" }} />
    <section className="progress-hero"><div><p>Actual records. One view.</p><h2>See the work you have documented across Futurion.</h2><span>No invented statistics and no competing readiness score.</span></div><aside><strong>{overview?.metrics?.roadmapCompletion?.percentage || 0}%</strong><small>recorded roadmap tasks complete</small></aside></section>
    {status.error && <div role="alert" className="profile-alert profile-alert-error mt-6">{status.error}</div>}
    {status.loading ? <div className="profile-loading mt-6">Consolidating your Futurion records…</div> : overview && <>
      <ProgressMetricGrid metrics={overview.metrics} />
      <div className="progress-primary-grid"><ActivityTimeline items={timeline} /><AchievementsPanel achievements={achievements} compact /></div>
      <GrowthInsights insights={overview.insights} />
      <ProgressAiPanel available={aiAvailable} careerGoals={overview.insights?.careerGoalPreparation || []} />
      <p className="progress-methodology">{overview.methodology}</p>
    </>}
  </AppShell>;
}

export default ProgressDashboardPage;
