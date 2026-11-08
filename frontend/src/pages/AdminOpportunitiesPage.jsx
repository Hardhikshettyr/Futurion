import { useCallback, useEffect, useState } from "react";
import AppShell from "../layouts/AppShell.jsx";
import { getCareers } from "../services/careerApi.js";
import {
  createOpportunity, deleteOpportunity, getAdminOpportunities, getAdminOpportunity,
  setOpportunityStatus, updateOpportunity,
} from "../services/opportunityApi.js";
import { getSkillLibrary } from "../services/skillApi.js";

const types = ["internship", "full_time_job", "graduate_trainee", "apprenticeship", "scholarship", "fellowship", "research", "competition", "other"];
const empty = { title: "", organization: "", description: "", opportunityType: "internship", careerIds: [], skillIds: [], location: "", workMode: "unknown", compensationSummary: "", applicationDeadline: "", externalApplicationUrl: "", externalUrlVerified: false, status: "active", educationDescription: "", educationLevels: [], qualificationNames: "", experienceDescription: "", minimumMonths: 0, conditions: "" };

function selected(event) { return [...event.target.selectedOptions].map((option) => option.value); }
function lines(value) { return value.split("\n").map((item) => item.trim()).filter(Boolean); }

function AdminOpportunitiesPage() {
  const [records, setRecords] = useState([]); const [careers, setCareers] = useState([]); const [skills, setSkills] = useState([]);
  const [editingId, setEditingId] = useState(""); const [existingSkills, setExistingSkills] = useState([]); const [form, setForm] = useState(empty);
  const [status, setStatus] = useState({ loading: true, saving: false, error: "", message: "" });

  const load = useCallback(async () => {
    setStatus((value) => ({ ...value, loading: true, error: "" }));
    try { const [data, careerData, skillData] = await Promise.all([getAdminOpportunities({ deadline: "all", limit: 50 }), getCareers({ limit: 50 }), getSkillLibrary({ status: "active", limit: 50 })]); setRecords(data.items || []); setCareers(careerData.items || []); setSkills(skillData.items || []); }
    catch (error) { setStatus((value) => ({ ...value, error: error.message })); }
    finally { setStatus((value) => ({ ...value, loading: false })); }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function edit(id) {
    try {
      const { opportunity } = await getAdminOpportunity(id); const education = opportunity.requiredEducation[0]; const experience = opportunity.experienceRequirements[0];
      setEditingId(id); setExistingSkills(opportunity.requiredSkills);
      setForm({ title: opportunity.title, organization: opportunity.organization, description: opportunity.description, opportunityType: opportunity.opportunityType, careerIds: opportunity.careers.map((item) => item.id), skillIds: opportunity.requiredSkills.map((item) => item.skill.id), location: opportunity.location, workMode: opportunity.workMode, compensationSummary: opportunity.compensation?.summary || "", applicationDeadline: opportunity.applicationDeadline ? new Date(opportunity.applicationDeadline).toISOString().slice(0, 10) : "", externalApplicationUrl: opportunity.externalApplicationUrl, externalUrlVerified: opportunity.externalUrlVerified, status: opportunity.status, educationDescription: education?.description || "", educationLevels: education?.acceptedLevels || [], qualificationNames: opportunity.requiredQualifications.map((item) => item.name).join("\n"), experienceDescription: experience?.description || "", minimumMonths: experience?.minimumMonths || 0, conditions: opportunity.otherConditions.map((item) => `${item.label}: ${item.description}`).join("\n") });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) { setStatus((value) => ({ ...value, error: error.message })); }
  }

  function payload() {
    const skillById = new Map(existingSkills.map((item) => [item.skill.id, item]));
    return {
      title: form.title, organization: form.organization, description: form.description, opportunityType: form.opportunityType,
      careerIds: form.careerIds,
      requiredSkills: form.skillIds.map((skillId) => { const prior = skillById.get(skillId); return prior ? { skillId, minimumProficiency: prior.minimumProficiency, evidenceRequired: prior.evidenceRequired, importance: prior.importance, rationale: prior.rationale } : { skillId, minimumProficiency: "beginner", evidenceRequired: "recorded", importance: "mandatory", rationale: "" }; }),
      requiredEducation: form.educationDescription ? [{ acceptedLevels: form.educationLevels, acceptedDegrees: [], acceptedDisciplines: [], acceptedStatuses: [], recentGraduateWithinYears: null, importance: "mandatory", description: form.educationDescription }] : [],
      requiredQualifications: lines(form.qualificationNames).map((name) => ({ name, issuer: "", importance: "mandatory", description: "" })),
      experienceRequirements: form.experienceDescription ? [{ minimumMonths: Number(form.minimumMonths), acceptedTypes: [], importance: "mandatory", description: form.experienceDescription }] : [],
      eligibleGraduationYears: [], graduationYearImportance: "mandatory",
      otherConditions: lines(form.conditions).map((entry) => { const [label, ...description] = entry.split(":"); return { label: label.trim(), description: description.join(":").trim() || label.trim(), importance: "mandatory" }; }),
      location: form.location, workMode: form.workMode,
      compensation: { summary: form.compensationSummary, currency: "", minimum: null, maximum: null, period: "unknown" },
      applicationDeadline: form.applicationDeadline || null, externalApplicationUrl: form.externalApplicationUrl,
      externalUrlVerified: form.externalUrlVerified, status: form.status,
    };
  }

  async function submit(event) {
    event.preventDefault(); setStatus((value) => ({ ...value, saving: true, error: "", message: "" }));
    try { const response = editingId ? await updateOpportunity(editingId, payload()) : await createOpportunity(payload()); setStatus((value) => ({ ...value, saving: false, message: response.message })); setForm(empty); setEditingId(""); setExistingSkills([]); await load(); }
    catch (error) { setStatus((value) => ({ ...value, saving: false, error: error.message })); }
  }
  async function toggle(record) { try { await setOpportunityStatus(record.id, record.status === "active" ? "inactive" : "active"); await load(); } catch (error) { setStatus((value) => ({ ...value, error: error.message })); } }
  async function remove(record) { if (!window.confirm(`Delete ${record.title} and student tracker references?`)) return; try { await deleteOpportunity(record.id); await load(); } catch (error) { setStatus((value) => ({ ...value, error: error.message })); } }

  return <AppShell eyebrow="Platform administration" title="Opportunity library">
    {status.error && <div role="alert" className="profile-alert profile-alert-error">{status.error}</div>}{status.message && <div role="status" className="profile-alert profile-alert-success">{status.message}</div>}
    <div className="admin-opportunity-layout"><form className="admin-opportunity-form" onSubmit={submit}><p className="eyebrow">{editingId ? "Edit opportunity" : "Create opportunity"}</p><h2>Verified opportunity record</h2><label>Title<input required className="field-input" value={form.title} onChange={(event) => setForm((value) => ({ ...value, title: event.target.value }))} /></label><label>Organization<input required className="field-input" value={form.organization} onChange={(event) => setForm((value) => ({ ...value, organization: event.target.value }))} /></label><label>Description<textarea required className="field-input" value={form.description} onChange={(event) => setForm((value) => ({ ...value, description: event.target.value }))} /></label><div className="grid gap-3 sm:grid-cols-2"><label>Type<select className="field-input" value={form.opportunityType} onChange={(event) => setForm((value) => ({ ...value, opportunityType: event.target.value }))}>{types.map((item) => <option key={item} value={item}>{item.replaceAll("_", " ")}</option>)}</select></label><label>Work mode<select className="field-input" value={form.workMode} onChange={(event) => setForm((value) => ({ ...value, workMode: event.target.value }))}>{["unknown", "on_site", "hybrid", "remote"].map((item) => <option key={item} value={item}>{item.replaceAll("_", " ")}</option>)}</select></label></div><label>Career references<select multiple className="field-input admin-multi" value={form.careerIds} onChange={(event) => setForm((value) => ({ ...value, careerIds: selected(event) }))}>{careers.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label><label>Required Skill references <small>New selections default to mandatory beginner/recorded.</small><select multiple className="field-input admin-multi" value={form.skillIds} onChange={(event) => setForm((value) => ({ ...value, skillIds: selected(event) }))}>{skills.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>Education requirement<textarea className="field-input" value={form.educationDescription} onChange={(event) => setForm((value) => ({ ...value, educationDescription: event.target.value }))} /></label><label>Accepted education levels<select multiple className="field-input admin-multi" value={form.educationLevels} onChange={(event) => setForm((value) => ({ ...value, educationLevels: selected(event) }))}>{["secondary", "diploma", "undergraduate", "postgraduate", "doctoral"].map((item) => <option key={item}>{item}</option>)}</select></label><label>Qualifications <small>one per line</small><textarea className="field-input" value={form.qualificationNames} onChange={(event) => setForm((value) => ({ ...value, qualificationNames: event.target.value }))} /></label><div className="grid gap-3 sm:grid-cols-[120px_1fr]"><label>Experience months<input className="field-input" type="number" min="0" max="600" value={form.minimumMonths} onChange={(event) => setForm((value) => ({ ...value, minimumMonths: event.target.value }))} /></label><label>Experience requirement<input className="field-input" value={form.experienceDescription} onChange={(event) => setForm((value) => ({ ...value, experienceDescription: event.target.value }))} /></label></div><label>Other conditions <small>one “Label: description” per line</small><textarea className="field-input" value={form.conditions} onChange={(event) => setForm((value) => ({ ...value, conditions: event.target.value }))} /></label><label>Location<input required className="field-input" value={form.location} onChange={(event) => setForm((value) => ({ ...value, location: event.target.value }))} /></label><label>Compensation summary<input className="field-input" value={form.compensationSummary} onChange={(event) => setForm((value) => ({ ...value, compensationSummary: event.target.value }))} /></label><label>Deadline<input className="field-input" type="date" value={form.applicationDeadline} onChange={(event) => setForm((value) => ({ ...value, applicationDeadline: event.target.value }))} /></label><label>Official HTTPS application URL<input required className="field-input" type="url" value={form.externalApplicationUrl} onChange={(event) => setForm((value) => ({ ...value, externalApplicationUrl: event.target.value }))} /></label><label className="admin-check"><input type="checkbox" checked={form.externalUrlVerified} onChange={(event) => setForm((value) => ({ ...value, externalUrlVerified: event.target.checked }))} /> I verified this official URL</label><div className="flex gap-3"><button className="primary-button" disabled={status.saving}>{status.saving ? "Saving…" : editingId ? "Update opportunity" : "Create opportunity"}</button>{editingId && <button type="button" className="secondary-button" onClick={() => { setEditingId(""); setForm(empty); setExistingSkills([]); }}>Cancel</button>}</div></form>
      <section className="admin-opportunity-list"><p className="eyebrow">Catalogue records</p><h2>{records.length} opportunities</h2>{status.loading ? <div className="profile-loading">Loading records…</div> : records.map((record) => <article key={record.id}><div><span>{record.status} · {record.opportunityTypeLabel}</span><h3>{record.title}</h3><p>{record.organization} · {record.location}</p><small>{record.applicationDeadline ? new Date(record.applicationDeadline).toLocaleDateString() : "No fixed deadline"}</small></div><footer><button onClick={() => edit(record.id)}>Edit</button><button onClick={() => toggle(record)}>{record.status === "active" ? "Deactivate" : "Activate"}</button><button className="admin-delete" onClick={() => remove(record)}>Delete</button></footer></article>)}</section></div>
  </AppShell>;
}

export default AdminOpportunitiesPage;
