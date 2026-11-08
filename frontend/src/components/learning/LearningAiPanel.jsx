import { useState } from "react";
import { askLearningAssistant } from "../../services/learningApi.js";

function LearningAiPanel({ available, selectedIds, resourceNames }) {
  const [form, setForm] = useState({ question: "Compare the selected resources and suggest a grounded learning sequence for my goals.", weeklyHours: 5, pricePreference: "any" });
  const [status, setStatus] = useState({ loading: false, error: "", result: null });

  async function submit(event) {
    event.preventDefault();
    setStatus({ loading: true, error: "", result: null });
    try {
      const response = await askLearningAssistant({ ...form, weeklyHours: Number(form.weeklyHours), ...(selectedIds.length ? { resourceIds: selectedIds } : {}) });
      setStatus({ loading: false, error: "", result: response.result });
    } catch (error) { setStatus({ loading: false, error: error.message, result: null }); }
  }

  return <section className="learning-ai-panel">
    <div className="learning-ai-intro"><p className="eyebrow">Learning recommendations</p><h2>Ask about sequence, prerequisites, fit, time, or budget.</h2><p>Guidance references only recorded catalogue resources. It cannot invent resources or mark progress.</p><div className="learning-ai-selected">{selectedIds.length ? selectedIds.map((id) => <span key={id}>{resourceNames.get(id) || "Selected resource"}</span>) : <small>No resources selected—guidance will use relevant recommendations and catalogue matches.</small>}</div></div>
    <form onSubmit={submit}><label>Your question<textarea className="field-input" value={form.question} maxLength="1200" onChange={(event) => setForm((value) => ({ ...value, question: event.target.value }))} /></label><div className="grid gap-4 sm:grid-cols-2"><label>Weekly time<input className="field-input" type="number" min="1" max="80" value={form.weeklyHours} onChange={(event) => setForm((value) => ({ ...value, weeklyHours: event.target.value }))} /></label><label>Budget preference<select className="field-input" value={form.pricePreference} onChange={(event) => setForm((value) => ({ ...value, pricePreference: event.target.value }))}><option value="any">Any recorded price type</option><option value="free">Free only</option><option value="paid">Paid options</option></select></label></div><button className="primary-button" disabled={!available || status.loading || !form.question.trim()}>{status.loading ? "Reviewing resources…" : available ? "Generate recommendations" : "Currently unavailable"}</button></form>
    {status.error && <div role="alert" className="profile-alert profile-alert-error lg:col-span-2">Unable to complete this request. Please try again.</div>}
    {status.result && (() => { const resourceLabels = new Map([...(status.result.verifiedResources || []).map((item) => [item.id, item.title]), ...resourceNames]); return <div className="learning-ai-result"><h3>{status.result.summary}</h3>{status.result.resourceInsights.length > 0 && <div className="learning-ai-insights">{status.result.resourceInsights.map((item) => <article key={item.resourceId}><strong>{resourceLabels.get(item.resourceId) || "Catalogue resource"}</strong><p>{item.relevance}</p><small>{item.prerequisiteExplanation}</small></article>)}</div>}{status.result.learningSequence.length > 0 && <><h4>Suggested sequence</h4><ol>{[...status.result.learningSequence].sort((a, b) => a.position - b.position).map((item) => <li key={`${item.position}-${item.resourceId}`}><b>{item.position}</b><span><strong>{resourceLabels.get(item.resourceId) || "Catalogue resource"}</strong>{item.reason}</span></li>)}</ol></>}{status.result.generalGuidance.length > 0 && <><h4>General guidance</h4><ul>{status.result.generalGuidance.map((item) => <li key={item}>{item}</li>)}</ul></>}</div>; })()}
  </section>;
}

export default LearningAiPanel;
