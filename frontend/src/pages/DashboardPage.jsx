import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import landingHero from "../assets/futurion-landing-hero.png";
import Icon from "../components/ui/Icon.jsx";
import { Badge, EmptyState, LoadingSkeleton, ProgressBar } from "../components/ui/index.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useStudentProfile } from "../context/StudentProfileContext.jsx";
import AppShell from "../layouts/AppShell.jsx";
import { getLearningRecommendations } from "../services/learningApi.js";
import { getOpportunityRecommendations } from "../services/opportunityApi.js";
import { getProgressOverview } from "../services/progressPortfolioApi.js";
import { getRoadmaps } from "../services/roadmapApi.js";

const EMPTY_DASHBOARD = {
  learning: [],
  opportunities: [],
  overview: null,
  roadmaps: [],
};

function formatDate(value) {
  if (!value) return "No deadline recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No deadline recorded";
  return new Intl.DateTimeFormat("en", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

function firstName(name = "Student") {
  return name.trim().split(/\s+/)[0] || "Student";
}

function AdminDashboard({ user }) {
  const links = [
    ["skills", "Skill library", "Maintain the canonical skills used across student intelligence.", "/admin/skills"],
    ["careers", "Career library", "Review career paths and the requirements attached to them.", "/admin/careers"],
    ["learning", "Learning resources", "Curate resources students can connect to development goals.", "/admin/learning"],
    ["opportunities", "Opportunity library", "Manage active opportunities and explicit eligibility criteria.", "/admin/opportunities"],
  ];
  return <AppShell eyebrow="Administration" title={`Welcome, ${firstName(user.name)}`}>
    <section className="dashboard-admin-hero"><div><p>FUTURION ADMINISTRATION</p><h2>Keep the intelligence layer useful, current and explainable.</h2><span>Choose a library to review. Student records remain separate from platform catalogue management.</span></div><Icon name="settings" size={54} /></section>
    <div className="dashboard-admin-grid">{links.map(([icon, title, text, to]) => <Link key={to} to={to}><Icon name={icon} /><div><h3>{title}</h3><p>{text}</p></div><span>↗</span></Link>)}</div>
  </AppShell>;
}

function DashboardPage() {
  const { user } = useAuth();
  const { error: profileError, isLoading: isProfileLoading, profile } = useStudentProfile();
  const [data, setData] = useState(EMPTY_DASHBOARD);
  const [status, setStatus] = useState({ error: "", loading: user.role === "student" });

  const loadDashboard = useCallback(async () => {
    if (user.role !== "student") return;
    setStatus({ error: "", loading: true });
    const results = await Promise.allSettled([
      getProgressOverview(),
      getRoadmaps({ status: "active", page: 1, limit: 3 }),
      getLearningRecommendations(),
      getOpportunityRecommendations(),
    ]);
    const [progressResult, roadmapsResult, learningResult, opportunitiesResult] = results;
    setData({
      overview: progressResult.status === "fulfilled" ? progressResult.value.overview : null,
      roadmaps: roadmapsResult.status === "fulfilled" ? roadmapsResult.value.items || [] : [],
      learning: learningResult.status === "fulfilled" ? learningResult.value.items || [] : [],
      opportunities: opportunitiesResult.status === "fulfilled" ? opportunitiesResult.value.items || [] : [],
    });
    const failed = results.filter((result) => result.status === "rejected").length;
    setStatus({
      loading: false,
      error: failed === results.length
        ? "Dashboard information is temporarily unavailable. Your saved records are unchanged."
        : failed ? "Some dashboard sections could not be refreshed. Available records are shown below." : "",
    });
  }, [user.role]);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  const interests = useMemo(() => {
    const preferences = profile?.preferences || {};
    return [...new Set([
      ...(preferences.careerInterests || []),
      ...(preferences.preferredRoles || []),
      ...(preferences.preferredIndustries || []),
    ])].slice(0, 7);
  }, [profile]);

  if (user.role === "admin") return <AdminDashboard user={user} />;

  const metrics = data.overview?.metrics;
  const profileCompletion = profile?.completeness?.overall || 0;
  const skillCount = metrics?.skillsDeveloped ?? profile?.skills?.length ?? 0;
  const evidenceCount = metrics?.skillsWithEvidence ?? 0;
  const roadmapCompletion = metrics?.roadmapCompletion?.percentage || 0;
  const activity = data.overview?.recentActivity || [];
  const milestones = data.overview?.recentAchievements || [];
  const loading = status.loading || (isProfileLoading && !profile);
  const showGettingStarted = profileCompletion < 60 || skillCount === 0 || interests.length === 0;

  return (
    <AppShell eyebrow="Student overview" title={`Welcome, ${firstName(user.name)}`}>
      {status.error && <div role="alert" className="dashboard-alert">{status.error}<button type="button" onClick={loadDashboard}>Try again</button></div>}
      {profileError && !profile && <div role="alert" className="dashboard-alert">Your profile summary could not be loaded.</div>}

      <section className="dashboard-welcome">
        <div className="dashboard-welcome-copy"><p>YOUR CAREER WORKSPACE</p><h2>Good to see you, {firstName(user.name)}.</h2><span>Continue from the records you have already built, or take one focused next step today.</span><div><Link to="/dashboard/careers" className="dashboard-action-primary">Explore career paths <b>↗</b></Link><Link to="/profile" className="dashboard-action-secondary">Review my profile <b>→</b></Link></div></div>
        <div className="dashboard-welcome-art" aria-hidden="true"><span>PLAN · LEARN · GROW</span><img src={landingHero} alt="" loading="lazy" /></div>
      </section>

      {loading ? <div className="dashboard-loading-grid"><LoadingSkeleton lines={4} /><LoadingSkeleton lines={4} /><LoadingSkeleton lines={4} /></div> : <>
        {showGettingStarted && <section className="dashboard-start-guide" aria-labelledby="dashboard-start-title"><div><p>WELCOME TO FUTURION</p><h2 id="dashboard-start-title">Build direction one useful step at a time.</h2><span>Your career journey starts with your real background, interests and capabilities. These starting actions improve future recommendations without blocking any other workspace.</span></div><ol><li className={profileCompletion >= 60 ? "complete" : ""}><b>01</b><div><strong>{profileCompletion >= 60 ? "Profile foundation recorded" : "Complete your profile foundation"}</strong><p>Add academic information and career preferences so guidance can use relevant context.</p><Link to="/profile/edit">{profileCompletion >= 60 ? "Review profile" : "Complete profile"} →</Link></div></li><li className={skillCount > 0 ? "complete" : ""}><b>02</b><div><strong>{skillCount > 0 ? "Skills added" : "Add the skills you already possess"}</strong><p>Explore the Skill Library first; proficiency and supporting evidence can be updated later.</p><Link to="/dashboard/skills?view=library">Explore skills →</Link></div></li><li className={interests.length > 0 ? "complete" : ""}><b>03</b><div><strong>{interests.length > 0 ? "Career interests recorded" : "Explore possible career directions"}</strong><p>Save the paths that interest you. You do not need to make a final decision.</p><Link to="/dashboard/careers">Discover careers →</Link></div></li></ol></section>}
        <section className="dashboard-metric-grid" aria-label="Development summary">
          <article className="dashboard-profile-progress"><div className="dashboard-card-heading"><div><span>Profile foundation</span><h3>Profile completion</h3></div><strong>{profileCompletion}%</strong></div><ProgressBar value={profileCompletion} label="Profile completion" /><p>This measures recorded profile information only—not career readiness.</p><Link to="/profile/edit">Continue profile <b>→</b></Link></article>
          <article className="dashboard-metric-card"><span><Icon name="skills" /></span><div><small>Skills developed</small><strong>{skillCount}</strong><p>{evidenceCount} with supporting evidence</p></div><Link to="/dashboard/skills" aria-label="Open skill intelligence">↗</Link></article>
          <article className="dashboard-metric-card"><span><Icon name="roadmap" /></span><div><small>Roadmap progress</small><strong>{roadmapCompletion}%</strong><p>{metrics?.roadmapCompletion?.completedTasks || 0} of {metrics?.roadmapCompletion?.totalTasks || 0} tasks complete</p></div><Link to="/dashboard/roadmaps" aria-label="Open career roadmaps">↗</Link></article>
          <article className="dashboard-metric-card"><span><Icon name="opportunities" /></span><div><small>Tracked opportunities</small><strong>{metrics?.opportunitiesTracked || 0}</strong><p>From your application tracker</p></div><Link to="/dashboard/opportunities?view=tracker" aria-label="Open opportunity tracker">↗</Link></article>
        </section>

        <div className="dashboard-two-column">
          <section className="dashboard-panel dashboard-interests"><header><div><p>PROFILE SIGNALS</p><h2>Your interests</h2></div><Link to="/profile/edit?section=preferences">Edit profile</Link></header>{interests.length ? <div>{interests.map((interest) => <Badge key={interest}>{interest}</Badge>)}</div> : <EmptyState title="No interests recorded yet" description="Add career interests, preferred roles or industries to personalize your workspace." action={<Link to="/profile/edit?section=preferences">Add interests →</Link>} />}</section>

          <section className="dashboard-panel dashboard-skill-overview"><header><div><p>SKILL INTELLIGENCE</p><h2>Evidence at a glance</h2></div><Link to="/dashboard/skills">Open skills</Link></header><div className="dashboard-skill-ratio"><strong>{evidenceCount}</strong><span>of {skillCount} skills supported by evidence</span></div><ProgressBar value={skillCount ? Math.round((evidenceCount / skillCount) * 100) : 0} label="Skills with supporting evidence" /><p>Evidence can include projects, experience, certifications or other records you have attached.</p></section>
        </div>

        <section className="dashboard-panel dashboard-roadmaps"><header><div><p>ACTIVE ROADMAPS</p><h2>Continue your plan</h2></div><Link to="/dashboard/roadmaps">View all</Link></header>{data.roadmaps.length ? <div className="dashboard-roadmap-list">{data.roadmaps.map((roadmap) => <Link to={`/dashboard/roadmaps/${roadmap.id}`} key={roadmap.id}><div><span>{roadmap.targetCareer?.industry || "Career plan"}</span><strong>{roadmap.name}</strong><small>{roadmap.targetCareer?.title || "Personal development roadmap"}</small></div><b>{roadmap.progress?.completionPercentage || 0}%</b><ProgressBar value={roadmap.progress?.completionPercentage || 0} label={`${roadmap.name} completion`} /><footer><span>{roadmap.progress?.completedTasks || 0}/{roadmap.progress?.totalTasks || 0} tasks</span><i>Open roadmap →</i></footer></Link>)}</div> : <EmptyState title="No active roadmap yet" description="Choose a career direction and turn its requirements into a staged development plan." action={<Link to="/dashboard/careers">Explore careers →</Link>} />}</section>

        <div className="dashboard-recommendation-grid">
          <section className="dashboard-panel"><header><div><p>RECOMMENDED LEARNING</p><h2>Build the next skill</h2></div><Link to="/dashboard/learning">Explore</Link></header>{data.learning.length ? <div className="dashboard-compact-list">{data.learning.slice(0, 3).map(({ resource, priorityType }) => <Link key={resource.id} to={`/dashboard/learning/${resource.id}`}><span><Icon name="learning" /></span><div><strong>{resource.title}</strong><small>{resource.provider || resource.resourceType?.replaceAll("_", " ") || "Learning resource"}</small></div><Badge tone="muted">{priorityType === "prerequisite_first" ? "Prerequisite" : "Goal match"}</Badge></Link>)}</div> : <EmptyState title="No matched resources yet" description="Record career goals and learning needs to unlock relevant resources." action={<Link to="/dashboard/learning">Browse learning →</Link>} />}</section>

          <section className="dashboard-panel"><header><div><p>OPPORTUNITIES</p><h2>Worth exploring</h2></div><Link to="/dashboard/opportunities">Explore</Link></header>{data.opportunities.length ? <div className="dashboard-compact-list">{data.opportunities.slice(0, 3).map(({ opportunity }) => <Link key={opportunity.id} to={`/dashboard/opportunities/${opportunity.id}`}><span><Icon name="opportunities" /></span><div><strong>{opportunity.title}</strong><small>{opportunity.organization} · {formatDate(opportunity.applicationDeadline)}</small></div><i>↗</i></Link>)}</div> : <EmptyState title="No active recommendations" description="No current opportunity matches are available from your recorded profile." action={<Link to="/dashboard/opportunities">Browse opportunities →</Link>} />}</section>
        </div>

        <div className="dashboard-activity-grid">
          <section className="dashboard-panel"><header><div><p>RECENT ACTIVITY</p><h2>Your latest progress</h2></div><Link to="/dashboard/progress">Full timeline</Link></header>{activity.length ? <ol className="dashboard-activity-list">{activity.slice(0, 5).map((item) => <li key={item.id}><span><Icon name={item.module === "roadmaps" ? "roadmap" : item.module === "learning" ? "learning" : item.module === "opportunities" ? "opportunities" : item.module === "skills" ? "skills" : "profile"} /></span><div><strong>{item.title}</strong><p>{item.description}</p><small>{formatDate(item.date)}</small></div></li>)}</ol> : <EmptyState title="No activity recorded yet" description="Your documented skills, learning, roadmap and opportunity activity will appear here." />}</section>

          <section className="dashboard-panel dashboard-milestones"><header><div><p>MILESTONES</p><h2>Recent achievements</h2></div><Link to="/dashboard/progress">View progress</Link></header>{milestones.length ? <div>{milestones.map((item) => <Link to={item.href || "/dashboard/progress"} key={item.key}><span>◆</span><div><strong>{item.title}</strong><small>{formatDate(item.date)}</small></div></Link>)}</div> : <EmptyState title="Milestones begin with action" description="Complete your first documented project, learning resource or roadmap stage." />}</section>
        </div>
      </>}
    </AppShell>
  );
}

export default DashboardPage;
