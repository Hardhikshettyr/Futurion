import { useSearchParams } from "react-router-dom";
import ModuleIntroduction from "../components/ui/ModuleIntroduction.jsx";
import CompetencyAnalysisPanel from "../components/skills/CompetencyAnalysisPanel.jsx";
import AiSkillAnalysisPanel from "../components/skills/AiSkillAnalysisPanel.jsx";
import LearningStrategyPanel from "../components/skills/LearningStrategyPanel.jsx";
import MySkillsPanel from "../components/skills/MySkillsPanel.jsx";
import RecommendationsPanel from "../components/skills/RecommendationsPanel.jsx";
import SkillAssessmentPanel from "../components/skills/SkillAssessmentPanel.jsx";
import SkillGapCoachPanel from "../components/skills/SkillGapCoachPanel.jsx";
import SkillOverview from "../components/skills/SkillOverview.jsx";
import { useSkillIntelligence } from "../context/SkillIntelligenceContext.jsx";
import AppShell from "../layouts/AppShell.jsx";

const TABS = [
  ["overview", "Overview"],
  ["my-skills", "My skills"],
  ["library", "Skill Library"],
  ["competency", "Competency analysis"],
  ["recommendations", "Recommendations"],
  ["ai-analysis", "Skill insights"],
  ["learning", "Learning strategy"],
  ["coach", "Development guidance"],
  ["assessments", "Knowledge checks"],
];

const SKILL_GUIDE = [
  ["my-skills", "My Skills", "View proficiency, learning status and the evidence attached to skills you track."],
  ["library", "Skill Library", "Explore structured academic and professional skills and add relevant ones to your profile."],
  ["assessments", "Skill Assessment", "Use a knowledge check to reflect on your current understanding of an individual skill."],
  ["my-skills", "Skill Evidence", "Connect projects, certifications, experience and other records that demonstrate a skill."],
  ["my-skills", "Skill Dependencies", "See which foundational skills support more advanced capabilities."],
  ["competency", "Competency Analysis", "Compare current capabilities with selected career requirements and development areas."],
];

function SkillIntelligencePage() {
  const [params, setParams] = useSearchParams();
  const requested = params.get("view");
  const active = TABS.some(([key]) => key === requested) ? requested : "overview";
  const requestedSkillId = params.get("skill") || "";
  const {
    error,
    isLoading,
    methodology,
    overview,
    recommendations,
    refreshSkillIntelligence,
  } = useSkillIntelligence();

  function navigate(view) {
    setParams({ view });
  }

  return (
    <AppShell eyebrow="Skill intelligence" title="Competency map">
      <ModuleIntroduction eyebrow="Understand your capabilities" title="Skill Intelligence" description="Organize your current abilities, evaluate proficiency and identify areas to develop based on your career interests." value="Start with the Skill Library, add the skills you already possess, then connect evidence and review the foundational knowledge that supports further growth." capabilities={["Manage skills and proficiency", "Attach projects, certifications and experience as evidence", "Explore dependencies, competency gaps and recommendations"]} action={{ onClick: () => navigate("library"), label: "Explore the Skill Library" }} />
      <section className="skill-hero">
        <div className="relative z-10 max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[.18em] text-[#f2a078]">Evidence-aware growth</p>
          <h2 className="mt-4 font-serif text-4xl leading-tight text-white sm:text-5xl">See what you know, what supports it, and what connects next.</h2>
          <p className="mt-5 max-w-2xl text-sm leading-7 text-[#c3d9d3]">A transparent map built from your choices, supporting evidence and Futurion’s curated relationships—with optional advisory guidance that never changes your records.</p>
        </div>
        <div className="skill-hero-grid" aria-hidden="true" />
      </section>
      <section className="skill-guide" aria-labelledby="skill-guide-title"><div><p className="eyebrow">How this workspace is organized</p><h2 id="skill-guide-title">Choose the part of your skill development you want to work on.</h2><p>Each section uses the same skill and profile records, so you can move between exploration, evidence and development without entering the same information twice.</p></div><div className="skill-guide-grid">{SKILL_GUIDE.map(([view, title, description], index) => <button type="button" key={`${title}-${index}`} onClick={() => navigate(view)}><span>{String(index + 1).padStart(2, "0")}</span><strong>{title}</strong><p>{description}</p><b>Open section →</b></button>)}</div></section>
      <nav className="skill-page-tabs" aria-label="Skill intelligence sections">
        {TABS.map(([key, label]) => <button key={key} type="button" onClick={() => navigate(key)} className={active === key ? "skill-page-tab-active" : ""}>{label}</button>)}
      </nav>
      {error && <div role="alert" className="profile-alert profile-alert-error mb-6">{error}<button type="button" onClick={refreshSkillIntelligence} className="ml-2 font-bold underline">Try again</button></div>}
      {active === "overview" && <SkillOverview isLoading={isLoading} overview={overview} recommendations={recommendations} onNavigate={navigate} />}
      {active === "my-skills" && <MySkillsPanel key="my-skills" onMutation={refreshSkillIntelligence} />}
      {active === "library" && <MySkillsPanel key="library" initialLibraryOpen onMutation={refreshSkillIntelligence} />}
      {active === "competency" && <CompetencyAnalysisPanel />}
      {active === "recommendations" && <RecommendationsPanel items={recommendations} isLoading={isLoading} methodology={methodology} onAdded={refreshSkillIntelligence} />}
      {active === "ai-analysis" && <AiSkillAnalysisPanel />}
      {active === "learning" && <LearningStrategyPanel initialSkillId={requestedSkillId} />}
      {active === "coach" && <SkillGapCoachPanel />}
      {active === "assessments" && <SkillAssessmentPanel initialSkillId={requestedSkillId} />}
    </AppShell>
  );
}

export default SkillIntelligencePage;
