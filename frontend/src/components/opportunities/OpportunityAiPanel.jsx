import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { askOpportunityAssistant } from "../../services/opportunityApi.js";

function OpportunityAiPanel({ opportunityId, eligibility, available }) {
  const requirementNames = useMemo(() => new Map((eligibility?.requirements || []).map((item) => [item.key, item.title])), [eligibility]);
  const [question, setQuestion] = useState("Explain my eligibility gaps and suggest grounded preparation steps for this opportunity.");
  const [status, setStatus] = useState({ loading: false, error: "", result: null });

  async function submit(event) {
    event.preventDefault();
    setStatus({ loading: true, error: "", result: null });
    try { const response = await askOpportunityAssistant(opportunityId, { question }); setStatus({ loading: false, error: "", result: response.result }); }
    catch { setStatus({ loading: false, error: "Unable to complete this request. Please try again.", result: null }); }
  }

  return (
    <section className="opportunity-ai">
      <div>
        <p className="eyebrow">Opportunity guidance</p>
        <h2>Prepare from your recorded information.</h2>
        <p>Guidance can explain the eligibility review, but it never changes your application tracker or the opportunity requirements.</p>
      </div>
      <form onSubmit={submit}>
        <label><span className="sr-only">Question for opportunity guidance</span><textarea aria-label="Question for opportunity guidance" className="field-input" maxLength="1200" value={question} onChange={(event) => setQuestion(event.target.value)} /></label>
        <button className="primary-button" disabled={!available || status.loading || !question.trim()}>{status.loading ? "Reviewing context…" : available ? "Get guidance" : "Guidance is temporarily unavailable"}</button>
      </form>
      {status.error && <div role="alert" className="profile-alert profile-alert-error">{status.error}</div>}
      {status.result && (
        <div className="opportunity-ai-result">
          <h3>{status.result.summary}</h3>
          <section><h4>Opportunity explained</h4><p>{status.result.opportunityExplanation}</p></section>
          {status.result.eligibilityExplanations.length > 0 && <section><h4>Eligibility explanation</h4>{status.result.eligibilityExplanations.map((item) => <p key={item.requirementKey}><b>{requirementNames.get(item.requirementKey) || "Recorded requirement"}:</b> {item.explanation}</p>)}</section>}
          {status.result.missingRequirementActions.length > 0 && <section><h4>Ways to close gaps</h4>{status.result.missingRequirementActions.map((item) => <article key={item.requirementKey}><strong>{requirementNames.get(item.requirementKey) || "Requirement"}</strong><ul>{item.actions.map((action) => <li key={action}>{action}</li>)}</ul></article>)}</section>}
          {status.result.preparationSteps.length > 0 && <section><h4>Preparation steps</h4><ol>{status.result.preparationSteps.map((step) => <li key={`${step.title}-${step.rationale}`}><strong>{step.title}</strong><span>{step.rationale}</span>{step.roadmapId && <Link to={`/dashboard/roadmaps/${step.roadmapId}`}>Open referenced roadmap</Link>}</li>)}</ol></section>}
          {status.result.applicationPreparation.length > 0 && <section><h4>Application preparation</h4><ul>{status.result.applicationPreparation.map((item) => <li key={item}>{item}</li>)}</ul></section>}
          {status.result.uncertainties.length > 0 && <section><h4>Uncertainties to verify</h4><ul>{status.result.uncertainties.map((item) => <li key={item}>{item}</li>)}</ul></section>}
        </div>
      )}
    </section>
  );
}

export default OpportunityAiPanel;
