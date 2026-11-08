import { useCallback, useEffect, useState } from "react";
import AppShell from "../layouts/AppShell.jsx";
import {
  changeCareerRelationship, createCareer, getAdminCareer, getAdminCareers,
  getCareerCategories, setCareerStatus, updateCareer,
} from "../services/careerApi.js";
import { getSkillLibrary } from "../services/skillApi.js";

const blank = {
  title: "", shortDescription: "", overview: "", careerCategory: "other", industry: "",
  responsibilities: "", acceptedDisciplines: "", educationPathways: [], careerProgression: [], tools: "", entryRoles: "",
  workEnvironments: "", employmentTypes: ["full_time"], workModes: ["hybrid", "on_site"],
  tags: "", aliases: "", featured: false, popularityRank: 0, essentialSkills: [], desirableSkills: [],
};

const split = (value) => value.split(/\n|,/).map((item) => item.trim()).filter(Boolean);
const join = (values) => (values || []).join("\n");

function SkillMapper({ label, rows, skills, onChange }) {
  function add() {
    const available = skills.find((skill) => !rows.some((row) => row.skillId === skill.id));
    if (available) onChange([...rows, { skillId: available.id, requiredProficiency: "beginner", rationale: "" }]);
  }
  return <fieldset className="career-admin-block"><div className="flex items-center justify-between"><legend>{label}</legend><button type="button" className="text-xs font-bold underline" onClick={add}>Add skill</button></div><div className="mt-3 space-y-3">{rows.map((row, index) => <div key={`${row.skillId}-${index}`} className="grid gap-2 sm:grid-cols-[1fr_130px_auto]"><select className="field-input" value={row.skillId} onChange={(event) => onChange(rows.map((item, itemIndex) => itemIndex === index ? { ...item, skillId: event.target.value } : item))}>{skills.map((skill) => <option key={skill.id} value={skill.id}>{skill.name}</option>)}</select><select className="field-input" value={row.requiredProficiency} onChange={(event) => onChange(rows.map((item, itemIndex) => itemIndex === index ? { ...item, requiredProficiency: event.target.value } : item))}>{["beginner", "intermediate", "advanced", "expert"].map((level) => <option key={level}>{level}</option>)}</select><button type="button" className="px-3 text-xs font-bold text-[#a34c3a]" onClick={() => onChange(rows.filter((_, itemIndex) => itemIndex !== index))}>Remove</button></div>)}</div></fieldset>;
}

function AdminCareersPage() {
  const [query, setQuery] = useState({ q: "", status: "active", page: 1, limit: 50 });
  const [records, setRecords] = useState([]);
  const [skills, setSkills] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(blank);
  const [relationshipId, setRelationshipId] = useState("");
  const [status, setStatus] = useState({ loading: true, saving: false, error: "", message: "" });

  const load = useCallback(async () => {
    setStatus((current) => ({ ...current, loading: true, error: "" }));
    try {
      const [careerData, skillData, categoryData] = await Promise.all([getAdminCareers(query), getSkillLibrary({ status: "active", limit: 50 }), getCareerCategories()]);
      setRecords(careerData.items || []); setSkills(skillData.items || []); setCategories(categoryData.categories || []);
    } catch (error) { setStatus((current) => ({ ...current, error: error.message })); }
    finally { setStatus((current) => ({ ...current, loading: false })); }
  }, [query]);
  useEffect(() => { load(); }, [load]);

  function reset() { setSelected(null); setForm(blank); setRelationshipId(""); }

  async function choose(item) {
    setStatus((current) => ({ ...current, error: "", message: "" }));
    try {
      const { career } = await getAdminCareer(item.id);
      setSelected(career);
      setForm({
        title: career.title, shortDescription: career.shortDescription, overview: career.overview,
        careerCategory: career.careerCategory, industry: career.industry,
        responsibilities: join(career.responsibilities), acceptedDisciplines: join(career.acceptedDisciplines.map((entry) => entry.name)),
        educationPathways: career.requiredEducation.map((item) => ({ ...item, disciplines: join(item.disciplines) })),
        careerProgression: career.careerProgression.map((item) => ({ ...item, roles: join(item.roles) })),
        tools: join(career.toolsAndTechnologies),
        entryRoles: join(career.entryLevelRoles), workEnvironments: join(career.workEnvironments),
        employmentTypes: career.employmentTypes, workModes: career.workModes, tags: join(career.tags),
        aliases: join(career.aliases), featured: career.featured, popularityRank: career.popularityRank,
        essentialSkills: career.essentialSkills.map((entry) => ({ skillId: entry.skill.id, requiredProficiency: entry.requiredProficiency, rationale: entry.rationale })),
        desirableSkills: career.desirableSkills.map((entry) => ({ skillId: entry.skill.id, requiredProficiency: entry.requiredProficiency, rationale: entry.rationale })),
      });
    } catch (error) { setStatus((current) => ({ ...current, error: error.message })); }
  }

  function payload() {
    return {
      title: form.title, shortDescription: form.shortDescription, overview: form.overview,
      careerCategory: form.careerCategory, industry: form.industry, responsibilities: split(form.responsibilities),
      acceptedDisciplines: split(form.acceptedDisciplines).map((name) => ({ name, alignment: "common", notes: "" })),
      requiredEducation: form.educationPathways.map((item) => ({ ...item, disciplines: split(item.disciplines) })),
      essentialSkills: form.essentialSkills, desirableSkills: form.desirableSkills,
      toolsAndTechnologies: split(form.tools), entryLevelRoles: split(form.entryRoles), workEnvironments: split(form.workEnvironments),
      employmentTypes: form.employmentTypes, workModes: form.workModes, tags: split(form.tags), aliases: split(form.aliases),
      careerProgression: form.careerProgression.map((item) => ({ ...item, roles: split(item.roles) })),
      featured: form.featured, popularityRank: Number(form.popularityRank) || 0,
    };
  }

  async function save(event) {
    event.preventDefault(); setStatus((current) => ({ ...current, saving: true, error: "", message: "" }));
    try {
      const response = selected ? await updateCareer(selected.id, payload()) : await createCareer(payload());
      setStatus((current) => ({ ...current, message: response.message })); reset(); await load();
    } catch (error) { setStatus((current) => ({ ...current, error: error.message })); }
    finally { setStatus((current) => ({ ...current, saving: false })); }
  }

  async function toggleStatus() {
    try { await setCareerStatus(selected.id, selected.status === "active" ? "inactive" : "active"); reset(); await load(); }
    catch (error) { setStatus((current) => ({ ...current, error: error.message })); }
  }

  async function addRelationship(remove = false, targetId = relationshipId) {
    if (!targetId) return;
    try {
      const response = await changeCareerRelationship(selected.id, targetId, remove);
      setSelected(response.career); setRelationshipId("");
    } catch (error) { setStatus((current) => ({ ...current, error: error.message })); }
  }

  return <AppShell eyebrow="Platform administration" title="Career library">
    <div className="grid gap-7 xl:grid-cols-[.75fr_1.25fr]">
      <section className="skill-panel self-start"><div className="grid gap-3 sm:grid-cols-[1fr_140px]"><input className="field-input" placeholder="Search careers" value={query.q} onChange={(event) => setQuery((current) => ({ ...current, q: event.target.value, page: 1 }))} /><select className="field-input" value={query.status} onChange={(event) => setQuery((current) => ({ ...current, status: event.target.value }))}><option value="active">Active</option><option value="inactive">Inactive</option></select></div>{status.loading ? <div className="profile-loading mt-4">Loading Career Library…</div> : <div className="mt-4 max-h-[720px] space-y-2 overflow-y-auto">{records.map((career) => <button key={career.id} type="button" onClick={() => choose(career)} className={`skill-library-row ${selected?.id === career.id ? "skill-library-row-selected" : ""}`}><span><strong>{career.title}</strong><small>{career.industry} · {career.status}</small></span><span>Edit →</span></button>)}</div>}</section>
      <form onSubmit={save} className="skill-panel">
        <div className="flex justify-between gap-3"><div><p className="eyebrow">{selected ? "Edit catalogue record" : "Create catalogue record"}</p><h2 className="mt-2 font-serif text-3xl">{selected?.title || "New career"}</h2></div>{selected && <button type="button" className="text-xs font-bold underline" onClick={reset}>New career</button>}</div>
        {status.error && <div role="alert" className="profile-alert profile-alert-error mt-4">{status.error}</div>}{status.message && <div role="status" className="profile-alert profile-alert-success mt-4">{status.message}</div>}
        <div className="mt-5 grid gap-4 md:grid-cols-2"><label className="text-sm font-bold">Title<input className="field-input mt-2" required value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} /></label><label className="text-sm font-bold">Category<select className="field-input mt-2" value={form.careerCategory} onChange={(event) => setForm((current) => ({ ...current, careerCategory: event.target.value }))}>{categories.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}</select></label><label className="text-sm font-bold">Industry<input className="field-input mt-2" required value={form.industry} onChange={(event) => setForm((current) => ({ ...current, industry: event.target.value }))} /></label><label className="text-sm font-bold">Popularity rank<input className="field-input mt-2" type="number" min="0" max="10000" value={form.popularityRank} onChange={(event) => setForm((current) => ({ ...current, popularityRank: event.target.value }))} /></label><label className="text-sm font-bold md:col-span-2">Short description<textarea className="field-input mt-2 min-h-20" required value={form.shortDescription} onChange={(event) => setForm((current) => ({ ...current, shortDescription: event.target.value }))} /></label><label className="text-sm font-bold md:col-span-2">Overview<textarea className="field-input mt-2 min-h-32" required value={form.overview} onChange={(event) => setForm((current) => ({ ...current, overview: event.target.value }))} /></label></div>
        {[['responsibilities','Responsibilities'],['acceptedDisciplines','Accepted disciplines'],['tools','Tools and technologies'],['entryRoles','Entry-level roles'],['workEnvironments','Work environments'],['tags','Tags'],['aliases','Aliases']].map(([key,label]) => <label key={key} className="mt-4 block text-sm font-bold">{label} <small className="font-normal">(one per line)</small><textarea className="field-input mt-2 min-h-20" value={form[key]} onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))} /></label>)}
        <div className="career-admin-block"><div className="flex items-center justify-between"><legend>Education and alternative pathways</legend><button type="button" className="text-xs font-bold underline" onClick={() => setForm((current) => ({ ...current, educationPathways: [...current.educationPathways, { qualification: "", educationLevel: "", pathwayType: "common", description: "", disciplines: "" }] }))}>Add pathway</button></div><div className="mt-3 space-y-4">{form.educationPathways.map((pathway, index) => <div key={index} className="border-l-2 border-[#71a897] pl-3"><div className="grid gap-2 sm:grid-cols-[1fr_160px_auto]"><input className="field-input" required placeholder="Qualification or pathway" value={pathway.qualification} onChange={(event) => setForm((current) => ({ ...current, educationPathways: current.educationPathways.map((item, itemIndex) => itemIndex === index ? { ...item, qualification: event.target.value } : item) }))} /><select className="field-input" value={pathway.pathwayType} onChange={(event) => setForm((current) => ({ ...current, educationPathways: current.educationPathways.map((item, itemIndex) => itemIndex === index ? { ...item, pathwayType: event.target.value } : item) }))}><option value="mandatory">Mandatory</option><option value="common">Common</option><option value="alternative">Alternative</option></select><button type="button" className="px-2 text-xs font-bold text-[#a34c3a]" onClick={() => setForm((current) => ({ ...current, educationPathways: current.educationPathways.filter((_, itemIndex) => itemIndex !== index) }))}>Remove</button></div><input className="field-input mt-2" placeholder="Education level" value={pathway.educationLevel} onChange={(event) => setForm((current) => ({ ...current, educationPathways: current.educationPathways.map((item, itemIndex) => itemIndex === index ? { ...item, educationLevel: event.target.value } : item) }))} /><input className="field-input mt-2" placeholder="Disciplines, comma separated" value={pathway.disciplines} onChange={(event) => setForm((current) => ({ ...current, educationPathways: current.educationPathways.map((item, itemIndex) => itemIndex === index ? { ...item, disciplines: event.target.value } : item) }))} /><textarea className="field-input mt-2 min-h-20" placeholder="Explain scope, variation, and alternatives" value={pathway.description} onChange={(event) => setForm((current) => ({ ...current, educationPathways: current.educationPathways.map((item, itemIndex) => itemIndex === index ? { ...item, description: event.target.value } : item) }))} /></div>)}</div></div>
        <div className="career-admin-block"><div className="flex items-center justify-between"><legend>Career progression</legend><button type="button" className="text-xs font-bold underline" onClick={() => setForm((current) => ({ ...current, careerProgression: [...current.careerProgression, { level: "entry", roles: "", description: "" }] }))}>Add stage</button></div><div className="mt-3 space-y-4">{form.careerProgression.map((stage, index) => <div key={index} className="grid gap-2 sm:grid-cols-[130px_1fr_auto]"><select className="field-input" value={stage.level} onChange={(event) => setForm((current) => ({ ...current, careerProgression: current.careerProgression.map((item, itemIndex) => itemIndex === index ? { ...item, level: event.target.value } : item) }))}><option value="entry">Entry</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option></select><div><input className="field-input" placeholder="Roles, comma separated" value={stage.roles} onChange={(event) => setForm((current) => ({ ...current, careerProgression: current.careerProgression.map((item, itemIndex) => itemIndex === index ? { ...item, roles: event.target.value } : item) }))} /><textarea className="field-input mt-2 min-h-16" placeholder="Progression context (never a guarantee)" value={stage.description} onChange={(event) => setForm((current) => ({ ...current, careerProgression: current.careerProgression.map((item, itemIndex) => itemIndex === index ? { ...item, description: event.target.value } : item) }))} /></div><button type="button" className="px-2 text-xs font-bold text-[#a34c3a]" onClick={() => setForm((current) => ({ ...current, careerProgression: current.careerProgression.filter((_, itemIndex) => itemIndex !== index) }))}>Remove</button></div>)}</div></div>
        <SkillMapper label="Essential skills" rows={form.essentialSkills} skills={skills} onChange={(essentialSkills) => setForm((current) => ({ ...current, essentialSkills }))} /><SkillMapper label="Desirable skills" rows={form.desirableSkills} skills={skills.filter((skill) => !form.essentialSkills.some((item) => item.skillId === skill.id))} onChange={(desirableSkills) => setForm((current) => ({ ...current, desirableSkills }))} />
        <label className="mt-4 flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={form.featured} onChange={(event) => setForm((current) => ({ ...current, featured: event.target.checked }))} /> Featured career</label>
        {selected && <div className="career-admin-block"><legend>Related careers</legend><div className="mt-3 flex gap-2"><select className="field-input" value={relationshipId} onChange={(event) => setRelationshipId(event.target.value)}><option value="">Choose a career</option>{records.filter((item) => item.id !== selected.id && !selected.relatedCareers.some((related) => related.id === item.id)).map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select><button type="button" className="secondary-button" onClick={() => addRelationship()}>Add</button></div>{selected.relatedCareers.map((related) => <div key={related.id} className="admin-relationship-row"><strong>{related.title}</strong><button type="button" onClick={() => addRelationship(true, related.id)} className="text-xs font-bold text-[#a34c3a] underline">Remove</button></div>)}</div>}
        <div className="mt-6 flex flex-wrap gap-3"><button className="primary-button" disabled={status.saving}>{status.saving ? "Saving…" : selected ? "Save career" : "Create career"}</button>{selected && <button type="button" className="secondary-button" onClick={toggleStatus}>{selected.status === "active" ? "Deactivate" : "Reactivate"}</button>}</div>
      </form>
    </div>
  </AppShell>;
}

export default AdminCareersPage;
