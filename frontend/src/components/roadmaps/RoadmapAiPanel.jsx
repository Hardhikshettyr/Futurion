import { useMemo, useState } from "react";
import { askRoadmapAssistant } from "../../services/roadmapApi.js";

function RoadmapAiPanel({ roadmap, available }) {
  const tasks = useMemo(() => roadmap.stages.flatMap((stage) => stage.tasks).filter((task) => !task.retired), [roadmap]);
  const taskNames = useMemo(() => new Map(tasks.map((task) => [task.id, task.title])), [tasks]);
  const resourceNames = useMemo(() => new Map(tasks.flatMap((task) => task.linkedResources).map((item) => [item.id, item.title])), [tasks]);
  const [form, setForm] = useState({ question: "Explain my next roadmap tasks and how they build toward this career.", taskId: "" });
  const [status, setStatus] = useState({ loading: false, error: "", result: null });

  async function submit(event) {
    event.preventDefault();
    setStatus({ loading: true, error: "", result: null });
    try {
      const response = await askRoadmapAssistant(roadmap.id, { question: form.question, ...(form.taskId ? { taskId: form.taskId } : {}) });
      setStatus({ loading: false, error: "", result: response.result });
    } catch (error) { setStatus({ loading: false, error: error.message, result: null }); }
  }

  return <section className="roadmap-ai"><div><p className="eyebrow">Career Planning Assistant</p><h2>Understand the plan without changing it.</h2><p>Ask why a task matters, how to break it down, what its dependencies mean, or how weekly time changes the estimate. Guidance uses only this roadmap and your recorded information.</p></div><form onSubmit={submit}><label>Focus task<select className="field-input" value={form.taskId} onChange={(event) => setForm((value) => ({ ...value, taskId: event.target.value }))}><option value="">Whole roadmap</option>{tasks.map((task) => <option key={task.id} value={task.id}>{task.title}</option>)}</select></label><label>Your question<textarea className="field-input" maxLength="1200" value={form.question} onChange={(event) => setForm((value) => ({ ...value, question: event.target.value }))} /></label><button className="primary-button" disabled={!available || status.loading || !form.question.trim()}>{status.loading ? "Reviewing roadmap…" : available ? "Ask planning assistant" : "Currently unavailable"}</button></form>
    {status.error && <div role="alert" className="profile-alert profile-alert-error">Unable to complete this request. Please try again.</div>}
    {status.result && <div className="roadmap-ai-result"><h3>{status.result.summary}</h3>{status.result.taskInsights.map((insight) => <article key={insight.taskId}><h4>{taskNames.get(insight.taskId) || "Roadmap task"}</h4><p>{insight.whyItMatters}</p><ol>{insight.smallerSteps.map((step) => <li key={step}>{step}</li>)}</ol>{insight.resourceConnections.map((item) => <small key={item.resourceId}><b>{resourceNames.get(item.resourceId) || "Linked resource"}:</b> {item.explanation}</small>)}</article>)}<section><h4>Why this sequence</h4><p>{status.result.sequenceExplanation}</p></section>{status.result.timeAdjustments.length > 0 && <section><h4>Time adjustments</h4><ul>{status.result.timeAdjustments.map((item) => <li key={item}>{item}</li>)}</ul></section>}{status.result.completedContributions.length > 0 && <section><h4>Completed work contribution</h4><ul>{status.result.completedContributions.map((item) => <li key={item}>{item}</li>)}</ul></section>}{status.result.uncertainties.length > 0 && <section><h4>Uncertainties</h4><ul>{status.result.uncertainties.map((item) => <li key={item}>{item}</li>)}</ul></section>}</div>}
  </section>;
}

export default RoadmapAiPanel;
