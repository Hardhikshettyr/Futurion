import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import ModuleIntroduction from "../components/ui/ModuleIntroduction.jsx";
import AppShell from "../layouts/AppShell.jsx";
import { getCareers } from "../services/careerApi.js";
import { createRoadmap, getRoadmaps } from "../services/roadmapApi.js";

function RoadmapsPage() {
  const [roadmaps, setRoadmaps] = useState([]);
  const [careers, setCareers] = useState([]);
  const [filter, setFilter] = useState("");
  const [form, setForm] = useState({ targetCareerId: "", name: "", weeklyLearningHours: 5, targetDate: "" });
  const [status, setStatus] = useState({ loading: true, creating: false, error: "", message: "" });

  const load = useCallback(async () => {
    setStatus((value) => ({ ...value, loading: true, error: "" }));
    try {
      const [roadmapData, careerData] = await Promise.all([getRoadmaps({ status: filter || undefined, limit: 30 }), getCareers({ limit: 50 })]);
      setRoadmaps(roadmapData.items || []);
      setCareers(careerData.items || []);
    } catch (error) { setStatus((value) => ({ ...value, error: error.message })); }
    finally { setStatus((value) => ({ ...value, loading: false })); }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  async function submit(event) {
    event.preventDefault();
    setStatus((value) => ({ ...value, creating: true, error: "", message: "" }));
    try {
      const response = await createRoadmap({
        targetCareerId: form.targetCareerId,
        weeklyLearningHours: Number(form.weeklyLearningHours),
        ...(form.name.trim() ? { name: form.name.trim() } : {}),
        targetDate: form.targetDate || null,
      });
      setStatus((value) => ({ ...value, creating: false, message: response.message }));
      setForm({ targetCareerId: "", name: "", weeklyLearningHours: 5, targetDate: "" });
      await load();
    } catch (error) { setStatus((value) => ({ ...value, creating: false, error: error.message })); }
  }

  return <AppShell eyebrow="Personalized career planning" title="Career roadmaps">
    <ModuleIntroduction eyebrow="Turn direction into action" title="Career Roadmaps" description="Follow a structured preparation plan that breaks a career goal into manageable learning stages and actionable tasks." value="Create a roadmap from an active career, work through linked prerequisites and learning resources, and use progress to identify your next useful action." capabilities={["Create a staged plan for a target career", "Complete tasks and follow linked resources", "Track progress and review plan updates"]} action={{ onClick: () => document.querySelector(".roadmap-create")?.scrollIntoView({ behavior: "smooth" }), label: "Create a roadmap" }} />
    <section className="roadmap-hero"><div><p>From direction to deliberate action</p><h2>A roadmap built from your recorded skills and a real career target.</h2><span>Structured prerequisites · recorded learning links · task-based progress · reviewable updates</span></div><div><strong>{roadmaps.filter((item) => item.status === "active").length}</strong><small>active roadmaps</small></div></section>
    {status.error && <div role="alert" className="profile-alert profile-alert-error mt-6">{status.error}</div>}
    {status.message && <div role="status" className="profile-alert profile-alert-success mt-6">{status.message}</div>}
    <div className="roadmap-overview-grid">
      <form className="roadmap-create" onSubmit={submit}><p className="eyebrow">Create a roadmap</p><h2>Choose one target career.</h2><p>Futurion compares its structured requirements with your profile and skill records. You can keep multiple roadmaps.</p><label>Target career<select required className="field-input" value={form.targetCareerId} onChange={(event) => setForm((value) => ({ ...value, targetCareerId: event.target.value }))}><option value="">Select an active career</option>{careers.map((career) => <option key={career.id} value={career.id}>{career.title}</option>)}</select></label><label>Roadmap name <small>optional</small><input className="field-input" maxLength="140" value={form.name} onChange={(event) => setForm((value) => ({ ...value, name: event.target.value }))} placeholder="Use the career title by default" /></label><div className="grid gap-4 sm:grid-cols-2"><label>Hours each week<input required className="field-input" type="number" min="1" max="80" value={form.weeklyLearningHours} onChange={(event) => setForm((value) => ({ ...value, weeklyLearningHours: event.target.value }))} /></label><label>Target date <small>optional</small><input className="field-input" type="date" value={form.targetDate} onChange={(event) => setForm((value) => ({ ...value, targetDate: event.target.value }))} /></label></div><button className="primary-button" disabled={status.creating || !form.targetCareerId}>{status.creating ? "Building roadmap…" : "Create roadmap"}</button></form>
      <section className="roadmap-library"><div className="roadmap-library-heading"><div><p className="eyebrow">Your plans</p><h2>Continue a roadmap</h2></div><label>Show<select className="field-input" value={filter} onChange={(event) => setFilter(event.target.value)}><option value="">All statuses</option><option value="active">Active</option><option value="paused">Paused</option><option value="archived">Archived</option></select></label></div>{status.loading ? <div className="profile-loading">Loading roadmaps…</div> : roadmaps.length ? <div className="roadmap-card-list">{roadmaps.map((roadmap) => <Link to={`/dashboard/roadmaps/${roadmap.id}`} className="roadmap-card" key={roadmap.id}><div><span>{roadmap.status}</span><small>{roadmap.targetCareer?.industry || "Career plan"}</small></div><h3>{roadmap.name}</h3><p>{roadmap.targetCareer?.title}</p><div className="roadmap-card-track"><span style={{ width: `${roadmap.progress.completionPercentage}%` }} /></div><footer><strong>{roadmap.progress.completionPercentage}% complete</strong><span>{roadmap.progress.remainingHours}h remaining</span></footer></Link>)}</div> : <div className="roadmap-empty"><h3>No roadmaps here yet.</h3><p>Select a career to build your first personalized plan.</p></div>}</section>
    </div>
  </AppShell>;
}

export default RoadmapsPage;
