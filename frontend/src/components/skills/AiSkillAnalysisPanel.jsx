import { useEffect, useState } from "react";
import {
  generateAiSkillAnalysis,
  getAiSkillAnalysis,
  getSkillAiStatus,
} from "../../services/skillApi.js";

const SECTIONS = [
  ["strongestAreas", "Strongest areas", "What your current records support"],
  ["needsImprovement", "Areas to improve", "Where focused practice could help"],
  ["insufficientEvidence", "Evidence gaps", "Claims that need clearer support"],
  ["missingCompetencies", "Missing competencies", "Gaps connected to your stated direction"],
  ["learningPriorities", "Learning priorities", "A sensible order for attention"],
  ["strengthsToBuildUpon", "Strengths to build on", "Existing foundations you can reuse"],
];

function InsightCard({ insight }) {
  return (
    <article className="ai-insight-card">
      <h4>{insight.title}</h4>
      <p>{insight.explanation}</p>
      <div className="ai-basis-list">
        {insight.basis.map((basis) => <span key={basis}>{basis}</span>)}
      </div>
      <div className="ai-next-action"><strong>Next:</strong> {insight.suggestedAction}</div>
    </article>
  );
}

function AiSkillAnalysisPanel() {
  const [status, setStatus] = useState(null);
  const [analysisRecord, setAnalysisRecord] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    Promise.allSettled([getSkillAiStatus(), getAiSkillAnalysis()]).then(([statusResult, analysisResult]) => {
      if (!active) return;
      if (statusResult.status === "fulfilled") setStatus(statusResult.value);
      if (analysisResult.status === "fulfilled") setAnalysisRecord(analysisResult.value.analysis);
      if (statusResult.status === "rejected" && analysisResult.status === "rejected") {
        setError(statusResult.reason.message);
      }
      setIsLoading(false);
    });
    return () => { active = false; };
  }, []);

  async function generate(forceRefresh) {
    setIsGenerating(true);
    setError("");
    try {
      let competencyRequirements = [];
      try {
        competencyRequirements = JSON.parse(window.sessionStorage.getItem("futurion_competency_requirements") || "[]");
      } catch {
        competencyRequirements = [];
      }
      const result = await generateAiSkillAnalysis({ forceRefresh, competencyRequirements });
      setAnalysisRecord(result.analysis);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsGenerating(false);
    }
  }

  if (isLoading) return <div className="profile-loading">Loading your latest skill analysis…</div>;

  const analysis = analysisRecord?.analysis;
  return (
    <div className="space-y-6">
      <section className="skill-panel ai-analysis-intro">
        <div>
          <p className="eyebrow">Skill assessment</p>
          <h2 className="mt-2 font-serif text-3xl text-[#214743]">Your skills, read in context</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[#637873]">
            This review uses only your Futurion profile, recorded skills, evidence, projects, experience and declared interests. It cannot change your records.
          </p>
        </div>
        <button
          type="button"
          className="primary-button"
          disabled={isGenerating || status?.available === false}
          onClick={() => generate(Boolean(analysisRecord))}
        >
          {isGenerating ? "Reviewing…" : analysisRecord ? "Refresh skill insights" : "Generate skill insights"}
        </button>
      </section>

      {status?.available === false && (
        <div className="profile-feedback profile-feedback-info" role="status">
          Skill insights are currently unavailable. Your skill library, dependencies, recommendations and competency tools remain available.
        </div>
      )}
      {error && <div className="profile-alert profile-alert-error" role="alert">{error}</div>}

      {!analysis && status?.available !== false && !error && (
        <section className="skill-empty-state py-14">
          <p className="font-serif text-3xl">No skill assessment generated yet.</p>
          <small>Generate one when your profile and skill records are ready. Futurion keeps the latest review until you choose to refresh it.</small>
        </section>
      )}

      {analysis && (
        <>
          <section className="ai-summary-band">
            <div>
              <span className="ai-generated-label">Advisory review</span>
              <h3>Overall profile summary</h3>
              <p>{analysis.summary}</p>
            </div>
            <time dateTime={analysisRecord.generatedAt}>
              Generated {new Date(analysisRecord.generatedAt).toLocaleString()}
              {analysisRecord.cached ? " · cached" : ""}
            </time>
          </section>

          {SECTIONS.map(([key, title, subtitle]) => analysis[key]?.length > 0 && (
            <section key={key} className="skill-panel">
              <div className="skill-section-heading">
                <div><h3>{title}</h3><p>{subtitle}</p></div>
                <span>{analysis[key].length}</span>
              </div>
              <div className="ai-insight-grid">
                {analysis[key].map((insight, index) => <InsightCard key={`${insight.title}-${index}`} insight={insight} />)}
              </div>
            </section>
          ))}

          <section className="skill-panel ai-action-list">
            <div><p className="eyebrow">Action sequence</p><h3>What to do next</h3></div>
            <ol>{analysis.nextSteps.map((step, index) => <li key={step}><span>{index + 1}</span><p>{step}</p></li>)}</ol>
          </section>

          {analysis.dataLimitations.length > 0 && (
            <section className="ai-limitations">
              <strong>Information not provided</strong>
              <ul>{analysis.dataLimitations.map((item) => <li key={item}>{item}</li>)}</ul>
            </section>
          )}
          <p className="ai-disclaimer">Skill insights are advisory and do not change your profile, evidence or proficiency records.</p>
        </>
      )}
    </div>
  );
}

export default AiSkillAnalysisPanel;
