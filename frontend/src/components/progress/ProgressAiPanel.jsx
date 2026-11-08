import { useState } from "react";
import { askProgressAssistant } from "../../services/progressPortfolioApi.js";

function ProgressAiPanel({ available, careerGoals = [] }) {
  const [question, setQuestion] = useState(""); const [selectedCareerId, setSelectedCareerId] = useState("");
  const [result, setResult] = useState(null); const [status, setStatus] = useState({ loading: false, error: "" });
  async function submit(event) {
    event.preventDefault(); setStatus({ loading: true, error: "" });
    try { const response = await askProgressAssistant({ question, ...(selectedCareerId ? { selectedCareerId } : {}) }); setResult(response.result); }
    catch { setStatus({ loading: false, error: "Unable to complete this request. Please try again." }); return; }
    setStatus({ loading: false, error: "" });
  }
  return <section className="progress-ai"><div><p className="eyebrow">Career progress insights</p><h2>Ask for a grounded review of what you have documented.</h2><p>Suggestions are read-only drafts. Career Progress Insights cannot change your profile, portfolio, evidence or progress.</p></div>{available ? <><form onSubmit={submit}><label>Optional career goal<select className="field-input" value={selectedCareerId} onChange={(event) => setSelectedCareerId(event.target.value)}><option value="">General progress</option>{careerGoals.map((item) => <option key={item.career.id} value={item.career.id}>{item.career.title}</option>)}</select></label><label>Your question<textarea className="field-input" required maxLength="1200" value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="What should I prioritize next based on my documented progress?" /></label><button className="primary-button" disabled={status.loading}>{status.loading ? "Reviewing records…" : "Generate progress insights"}</button></form>{status.error && <div role="alert" className="profile-alert profile-alert-error">{status.error}</div>}{result && <div className="progress-ai-result"><h3>{result.summary}</h3>{result.documentedAchievements?.length > 0 && <section><h4>Documented achievements</h4>{result.documentedAchievements.map((item) => <p key={item.achievementKey}>{item.explanation}</p>)}</section>}{result.nextPriorities?.length > 0 && <section><h4>Suggested priorities</h4>{result.nextPriorities.map((item) => <article key={`${item.title}-${item.referenceId}`}><strong>{item.title}</strong><p>{item.rationale}</p><span>{item.module}</span></article>)}</section>}{result.projectDescriptionSuggestions?.length > 0 && <section><h4>Project description drafts</h4>{result.projectDescriptionSuggestions.map((item) => <article key={item.projectId}><p>{item.revisedDescription}</p><small>{item.reasoning}</small></article>)}</section>}{result.uncertainties?.length > 0 && <section><h4>Information to verify</h4>{result.uncertainties.map((item) => <p key={item}>{item}</p>)}</section>}</div>}</> : <div className="progress-ai-unavailable"><strong>Career Progress Insights are temporarily unavailable.</strong><p>The progress dashboard, timeline, achievements and portfolio remain fully available.</p></div>}
  </section>;
}

export default ProgressAiPanel;
