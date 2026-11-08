import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import RoadmapAiPanel from "../components/roadmaps/RoadmapAiPanel.jsx";
import RoadmapProgress from "../components/roadmaps/RoadmapProgress.jsx";
import RoadmapRefreshPanel from "../components/roadmaps/RoadmapRefreshPanel.jsx";
import RoadmapTimeline from "../components/roadmaps/RoadmapTimeline.jsx";
import AppShell from "../layouts/AppShell.jsx";
import {
  confirmRoadmapRefresh, deleteRoadmap, getRoadmap, getRoadmapAiStatus,
  refreshRoadmap, updateRoadmap, updateRoadmapTask,
} from "../services/roadmapApi.js";

function dateInput(value) {
  return value ? new Date(value).toISOString().slice(0, 10) : "";
}

function RoadmapDetailPage() {
  const { roadmapId } = useParams();
  const navigate = useNavigate();
  const [roadmap, setRoadmap] = useState(null);
  const [form, setForm] = useState({ name: "", weeklyLearningHours: 5, targetDate: "", status: "active" });
  const [aiAvailable, setAiAvailable] = useState(false);
  const [status, setStatus] = useState({ loading: true, saving: false, refreshing: false, busyTaskId: "", error: "", message: "" });

  const load = useCallback(async () => {
    setStatus((value) => ({ ...value, loading: true, error: "" }));
    try {
      const [data, ai] = await Promise.all([getRoadmap(roadmapId), getRoadmapAiStatus(roadmapId)]);
      setRoadmap(data.roadmap);
      setForm({ name: data.roadmap.name, weeklyLearningHours: data.roadmap.weeklyLearningHours, targetDate: dateInput(data.roadmap.targetDate), status: data.roadmap.status });
      setAiAvailable(ai.available);
    } catch (error) { setStatus((value) => ({ ...value, error: error.message })); }
    finally { setStatus((value) => ({ ...value, loading: false })); }
  }, [roadmapId]);

  useEffect(() => { load(); }, [load]);

  async function save(event) {
    event.preventDefault();
    setStatus((value) => ({ ...value, saving: true, error: "", message: "" }));
    try {
      const response = await updateRoadmap(roadmapId, { name: form.name.trim(), weeklyLearningHours: Number(form.weeklyLearningHours), targetDate: form.targetDate || null, status: form.status });
      setRoadmap(response.roadmap);
      setStatus((value) => ({ ...value, saving: false, message: response.message }));
    } catch (error) { setStatus((value) => ({ ...value, saving: false, error: error.message })); }
  }

  async function changeTask(taskId, taskStatus) {
    setStatus((value) => ({ ...value, busyTaskId: taskId, error: "", message: "" }));
    try {
      const response = await updateRoadmapTask(roadmapId, taskId, taskStatus);
      setRoadmap(response.roadmap);
      setStatus((value) => ({ ...value, busyTaskId: "", message: response.message }));
    } catch (error) { setStatus((value) => ({ ...value, busyTaskId: "", error: error.message })); }
  }

  async function generateRefresh() {
    setStatus((value) => ({ ...value, refreshing: true, error: "", message: "" }));
    try {
      const response = await refreshRoadmap(roadmapId);
      setRoadmap((value) => ({ ...value, pendingRefresh: response.proposal }));
      setStatus((value) => ({ ...value, refreshing: false, message: response.message }));
    } catch (error) { setStatus((value) => ({ ...value, refreshing: false, error: error.message })); }
  }

  async function confirmRefresh() {
    setStatus((value) => ({ ...value, refreshing: true, error: "", message: "" }));
    try {
      const response = await confirmRoadmapRefresh(roadmapId);
      setRoadmap(response.roadmap);
      setStatus((value) => ({ ...value, refreshing: false, message: response.message }));
    } catch (error) { setStatus((value) => ({ ...value, refreshing: false, error: error.message })); }
  }

  async function remove() {
    if (!window.confirm("Permanently delete this roadmap and its task history?")) return;
    try { await deleteRoadmap(roadmapId); navigate("/dashboard/roadmaps", { replace: true }); }
    catch (error) { setStatus((value) => ({ ...value, error: error.message })); }
  }

  return <AppShell eyebrow="Personalized career roadmap" title={roadmap?.name || "Roadmap details"}>
    <Link to="/dashboard/roadmaps" className="roadmap-back">← All roadmaps</Link>
    {status.error && <div role="alert" className="profile-alert profile-alert-error mt-5">{status.error}</div>}
    {status.message && <div role="status" className="profile-alert profile-alert-success mt-5">{status.message}</div>}
    {status.loading ? <div className="profile-loading mt-6">Loading roadmap…</div> : roadmap && <>
      <section className="roadmap-detail-hero"><div><span>{roadmap.status}</span><p>{roadmap.targetCareer?.industry}</p><h2>{roadmap.targetCareer?.title}</h2><small>Created {new Date(roadmap.createdAt).toLocaleDateString()} · Last updated {new Date(roadmap.updatedAt).toLocaleDateString()}</small></div><form onSubmit={save}><label>Name<input required className="field-input" maxLength="140" value={form.name} onChange={(event) => setForm((value) => ({ ...value, name: event.target.value }))} /></label><label>Weekly hours<input required className="field-input" type="number" min="1" max="80" value={form.weeklyLearningHours} onChange={(event) => setForm((value) => ({ ...value, weeklyLearningHours: event.target.value }))} /></label><label>Target date<input className="field-input" type="date" value={form.targetDate} onChange={(event) => setForm((value) => ({ ...value, targetDate: event.target.value }))} /></label><label>Status<select className="field-input" value={form.status} onChange={(event) => setForm((value) => ({ ...value, status: event.target.value }))}><option value="active">Active</option><option value="paused">Paused</option><option value="archived">Archived</option></select></label><button className="secondary-button" disabled={status.saving}>{status.saving ? "Saving…" : "Save settings"}</button></form></section>
      {roadmap.generationNotes.length > 0 && <section className="roadmap-notes"><strong>Planning notes</strong>{roadmap.generationNotes.map((note) => <p key={note}>{note}</p>)}</section>}
      <RoadmapProgress progress={roadmap.progress} />
      <RoadmapTimeline roadmap={roadmap} busyTaskId={status.busyTaskId} onTaskStatus={changeTask} />
      <RoadmapRefreshPanel proposal={roadmap.pendingRefresh} loading={status.refreshing} onGenerate={generateRefresh} onConfirm={confirmRefresh} />
      <RoadmapAiPanel roadmap={roadmap} available={aiAvailable} />
      <section className="roadmap-danger"><div><h2>Delete roadmap</h2><p>Archiving is reversible from settings. Deletion permanently removes the plan and its history.</p></div><button type="button" onClick={remove}>Delete permanently</button></section>
    </>}
  </AppShell>;
}

export default RoadmapDetailPage;
