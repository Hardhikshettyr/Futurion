import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useStudentProfile } from "../../context/StudentProfileContext.jsx";
import { addSkillEvidence, getSkillDependencies, removeSkillEvidence, updateStudentSkill } from "../../services/skillApi.js";
import { LEARNING_STATUSES, PROFICIENCIES, skillLabel } from "../../utils/skillLabels.js";
import DependencyMap from "./DependencyMap.jsx";

const evidenceTypes = ["project", "certification", "internship", "employment", "research", "coursework", "assessment", "other"];

function SkillDetailPanel({ initialRecord, onChanged, onClose }) {
  const { profile } = useStudentProfile();
  const [record, setRecord] = useState(initialRecord);
  const [dependency, setDependency] = useState(null);
  const [tab, setTab] = useState("progress");
  const [status, setStatus] = useState({ saving: false, error: "", message: "" });
  const [progress, setProgress] = useState({
    proficiency: initialRecord.proficiency,
    learningStatus: initialRecord.learningStatus,
    confidenceLevel: initialRecord.confidenceLevel || "",
    description: initialRecord.description || "",
    notes: initialRecord.notes || "",
  });
  const [evidence, setEvidence] = useState({ evidenceType: "project", referenceId: "", description: "", externalUrl: "", date: "" });

  useEffect(() => {
    let active = true;
    getSkillDependencies(record.skill.id)
      .then((result) => active && setDependency(result))
      .catch((error) => active && setStatus((current) => ({ ...current, error: error.message })));
    return () => { active = false; };
  }, [record.skill.id]);

  const referenceOptions = useMemo(() => {
    const map = {
      project: (profile?.projects || []).map((item) => [item.id, item.title]),
      certification: (profile?.certifications || []).map((item) => [item.id, `${item.name} · ${item.issuer}`]),
      internship: (profile?.experience || []).map((item) => [item.id, `${item.position} · ${item.organization}`]),
      employment: (profile?.experience || []).map((item) => [item.id, `${item.position} · ${item.organization}`]),
      research: [...(profile?.projects || []).map((item) => [item.id, item.title]), ...(profile?.experience || []).map((item) => [item.id, `${item.position} · ${item.organization}`])],
      coursework: (profile?.education || []).map((item) => [item.id, `${item.degree || item.academicDiscipline} · ${item.institution}`]),
    };
    return map[evidence.evidenceType] || [];
  }, [evidence.evidenceType, profile]);

  async function saveProgress(event) {
    event.preventDefault();
    setStatus({ saving: true, error: "", message: "" });
    try {
      const result = await updateStudentSkill(record.id, {
        ...progress,
        confidenceLevel: progress.confidenceLevel ? Number(progress.confidenceLevel) : null,
      });
      setRecord(result.studentSkill);
      await onChanged(result.studentSkill);
      setStatus({ saving: false, error: "", message: "Progress saved" });
    } catch (error) {
      setStatus({ saving: false, error: error.message, message: "" });
    }
  }

  async function saveEvidence(event) {
    event.preventDefault();
    setStatus({ saving: true, error: "", message: "" });
    try {
      const result = await addSkillEvidence(record.id, {
        ...evidence,
        referenceId: evidence.referenceId || null,
        date: evidence.date || null,
      });
      setRecord(result.studentSkill);
      setEvidence({ evidenceType: "project", referenceId: "", description: "", externalUrl: "", date: "" });
      await onChanged(result.studentSkill);
      setStatus({ saving: false, error: "", message: "Evidence connected" });
    } catch (error) {
      setStatus({ saving: false, error: error.message, message: "" });
    }
  }

  async function deleteEvidence(evidenceId) {
    if (!window.confirm("Remove this evidence link?")) return;
    try {
      const result = await removeSkillEvidence(record.id, evidenceId);
      setRecord(result.studentSkill);
      await onChanged(result.studentSkill);
    } catch (error) {
      setStatus((current) => ({ ...current, error: error.message }));
    }
  }

  return (
    <section className="skill-detail-panel">
      <div className="skill-detail-header">
        <div><p className="text-xs font-bold uppercase tracking-[.16em] text-[#f2a078]">{skillLabel(record.skill.category)}</p><h2 className="mt-2 font-serif text-4xl text-white">{record.skill.name}</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-[#bdd3cd]">{record.skill.description || "A canonical Futurion skill."}</p></div>
        <button type="button" onClick={onClose} className="ai-outline-button">Close details</button>
      </div>
      <div className="flex gap-2 overflow-x-auto border-x border-[#d4ddd6] bg-white px-4 pt-4" role="tablist">
        {["progress", "evidence", "dependencies"].map((value) => <button key={value} type="button" role="tab" aria-selected={tab === value} onClick={() => setTab(value)} className={`skill-tab ${tab === value ? "skill-tab-active" : ""}`}>{skillLabel(value)}</button>)}
      </div>
      <div className="border border-[#d4ddd6] bg-white p-5 sm:p-7">
        {status.error && <div role="alert" className="profile-alert profile-alert-error mb-5">{status.error}</div>}
        {status.message && <div role="status" className="profile-alert profile-alert-success mb-5">{status.message}</div>}
        <div className="skill-ai-actions">
          <div><span className="ai-generated-label">Optional development guidance</span><p>Use this exact skill and its recorded dependencies as context. Nothing is added or upgraded automatically.</p></div>
          <div><Link to={`/dashboard/skills?view=learning&skill=${record.skill.id}`} className="secondary-button">Build learning strategy</Link><Link to={`/dashboard/skills?view=assessments&skill=${record.skill.id}`} className="secondary-button">Generate assessment</Link><Link to="/dashboard/skills?view=coach" className="secondary-button">Ask development coach</Link></div>
        </div>
        <div className="skill-detail-tab-intro"><strong>{tab === "progress" ? "Your proficiency record" : tab === "evidence" ? "Supporting evidence" : "Foundational relationships"}</strong><p>{tab === "progress" ? "Update how you currently use or learn this skill. Self-reported proficiency remains separate from evidence and verification." : tab === "evidence" ? "Connect work you own—such as projects, certifications or experience—to show where you have applied this skill." : "Review only the prerequisite, related and dependent skills recorded in the Skill Library. No generic relationships are added."}</p></div>
        {tab === "progress" && <form onSubmit={saveProgress} className="grid gap-5 md:grid-cols-2">
          <label className="text-sm font-bold text-[#365753]">Proficiency<select className="field-input mt-2" value={progress.proficiency} onChange={(event) => setProgress((current) => ({ ...current, proficiency: event.target.value }))}>{PROFICIENCIES.map((value) => <option key={value} value={value}>{skillLabel(value)}</option>)}</select></label>
          <label className="text-sm font-bold text-[#365753]">Learning status<select className="field-input mt-2" value={progress.learningStatus} onChange={(event) => setProgress((current) => ({ ...current, learningStatus: event.target.value }))}>{LEARNING_STATUSES.map((value) => <option key={value} value={value}>{skillLabel(value)}</option>)}</select></label>
          <label className="text-sm font-bold text-[#365753]">Confidence (optional)<select className="field-input mt-2" value={progress.confidenceLevel} onChange={(event) => setProgress((current) => ({ ...current, confidenceLevel: event.target.value }))}><option value="">Not specified</option>{[1, 2, 3, 4, 5].map((value) => <option key={value} value={value}>{value} / 5</option>)}</select></label>
          <div className="border border-[#d4ddd6] bg-[#f7f8f4] p-4"><p className="text-xs font-bold uppercase tracking-wider text-[#6e817d]">Evidence status</p><p className="mt-2 font-bold text-[#284c48]">{skillLabel(record.evidenceStatus)}</p><p className="mt-1 text-xs leading-5 text-[#788985]">Students cannot select “verified.” Verification requires a separate authorized workflow.</p></div>
          <label className="text-sm font-bold text-[#365753] md:col-span-2">Description<textarea className="field-input mt-2 min-h-24" value={progress.description} onChange={(event) => setProgress((current) => ({ ...current, description: event.target.value }))} /></label>
          <label className="text-sm font-bold text-[#365753] md:col-span-2">Private notes<textarea className="field-input mt-2 min-h-24" value={progress.notes} onChange={(event) => setProgress((current) => ({ ...current, notes: event.target.value }))} /></label>
          <button className="primary-button md:col-span-2 md:w-fit" disabled={status.saving}>{status.saving ? "Saving…" : "Save progress"}</button>
        </form>}
        {tab === "evidence" && <div className="grid gap-7 lg:grid-cols-[1fr_.85fr]">
          <div><h3 className="font-serif text-2xl text-[#214743]">Connected evidence</h3><div className="mt-4 space-y-3">{record.evidence.map((item) => <article key={item.id} className="skill-evidence-card"><div><p className="text-xs font-bold uppercase tracking-wider text-[#6e817d]">{skillLabel(item.evidenceType)}</p><p className="mt-2 text-sm leading-6 text-[#526c67]">{item.description || "Linked profile evidence"}</p>{item.externalUrl && <a href={item.externalUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs font-bold text-[#174b47] underline">Open external reference</a>}</div><button type="button" onClick={() => deleteEvidence(item.id)} className="text-xs font-bold text-[#a34c3a] underline">Remove</button></article>)}{!record.evidence.length && <div className="skill-empty-state"><p>No evidence connected yet.</p><small>Evidence can support “demonstrated,” but never automatically means verified.</small></div>}</div></div>
          <form onSubmit={saveEvidence} className="border border-[#d4ddd6] bg-[#f8f6ef] p-5"><p className="eyebrow">Add evidence</p><div className="mt-4 space-y-4"><label className="block text-sm font-bold text-[#365753]">Type<select className="field-input mt-2" value={evidence.evidenceType} onChange={(event) => setEvidence((current) => ({ ...current, evidenceType: event.target.value, referenceId: "" }))}>{evidenceTypes.map((type) => <option key={type} value={type}>{skillLabel(type)}</option>)}</select></label>{referenceOptions.length > 0 && <label className="block text-sm font-bold text-[#365753]">Owned profile record<select className="field-input mt-2" value={evidence.referenceId} onChange={(event) => setEvidence((current) => ({ ...current, referenceId: event.target.value }))}><option value="">No linked record</option>{referenceOptions.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>}<label className="block text-sm font-bold text-[#365753]">Description<textarea className="field-input mt-2 min-h-20" value={evidence.description} onChange={(event) => setEvidence((current) => ({ ...current, description: event.target.value }))} /></label><label className="block text-sm font-bold text-[#365753]">External URL<input type="url" className="field-input mt-2" value={evidence.externalUrl} onChange={(event) => setEvidence((current) => ({ ...current, externalUrl: event.target.value }))} /></label><label className="block text-sm font-bold text-[#365753]">Evidence date<input type="date" className="field-input mt-2" value={evidence.date} onChange={(event) => setEvidence((current) => ({ ...current, date: event.target.value }))} /></label></div><button className="primary-button mt-5 w-full" disabled={status.saving}>{status.saving ? "Connecting…" : "Connect evidence"}</button></form>
        </div>}
        {tab === "dependencies" && <DependencyMap dependency={dependency} />}
      </div>
    </section>
  );
}

export default SkillDetailPanel;
