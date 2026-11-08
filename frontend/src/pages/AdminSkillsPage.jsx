import { useCallback, useEffect, useState } from "react";
import AppShell from "../layouts/AppShell.jsx";
import {
  changeSkillRelationship,
  createLibrarySkill,
  getSkillDependencies,
  getSkillLibrary,
  setLibrarySkillStatus,
  updateLibrarySkill,
} from "../services/skillApi.js";
import { SKILL_CATEGORIES, skillLabel } from "../utils/skillLabels.js";

const blank = { name: "", description: "", category: "other", subcategory: "", aliases: "", difficultyLevel: "foundational" };

function AdminSkillsPage() {
  const [query, setQuery] = useState({ q: "", status: "active", page: 1, limit: 50 });
  const [result, setResult] = useState({ items: [] });
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(blank);
  const [dependencies, setDependencies] = useState(null);
  const [relationship, setRelationship] = useState({ relationshipType: "related", targetSkillId: "", importance: "essential", minimumProficiency: "beginner", requiredForLevels: [] });
  const [status, setStatus] = useState({ loading: true, saving: false, error: "", message: "" });

  const load = useCallback(async () => {
    setStatus((current) => ({ ...current, loading: true, error: "" }));
    try {
      setResult(await getSkillLibrary(query));
    } catch (error) {
      setStatus((current) => ({ ...current, error: error.message }));
    } finally {
      setStatus((current) => ({ ...current, loading: false }));
    }
  }, [query]);

  useEffect(() => { load(); }, [load]);

  async function choose(skill) {
    setSelected(skill);
    setForm({
      name: skill.name,
      description: skill.description,
      category: skill.category,
      subcategory: skill.subcategory,
      aliases: skill.aliases.join(", "),
      difficultyLevel: skill.difficultyLevel,
    });
    try {
      setDependencies(await getSkillDependencies(skill.id));
    } catch (error) {
      setStatus((current) => ({ ...current, error: error.message }));
    }
  }

  function payload() {
    return {
      ...form,
      aliases: form.aliases.split(",").map((value) => value.trim()).filter(Boolean),
      ...(selected ? {} : { parentSkillId: null, relatedSkills: [], prerequisites: [], status: "active" }),
    };
  }

  async function save(event) {
    event.preventDefault();
    setStatus((current) => ({ ...current, saving: true, error: "", message: "" }));
    try {
      const response = selected
        ? await updateLibrarySkill(selected.id, payload())
        : await createLibrarySkill(payload());
      setStatus((current) => ({ ...current, message: response.message }));
      setSelected(null);
      setForm(blank);
      setDependencies(null);
      await load();
    } catch (error) {
      setStatus((current) => ({ ...current, error: error.message }));
    } finally {
      setStatus((current) => ({ ...current, saving: false }));
    }
  }

  async function toggleStatus() {
    try {
      await setLibrarySkillStatus(selected.id, selected.status === "active" ? "inactive" : "active");
      setSelected(null);
      setForm(blank);
      setDependencies(null);
      await load();
    } catch (error) {
      setStatus((current) => ({ ...current, error: error.message }));
    }
  }

  async function updateRelationship(remove = false, values = relationship) {
    if (!selected || !values.targetSkillId) return;
    try {
      const response = await changeSkillRelationship(
        selected.id,
        values.relationshipType,
        values.targetSkillId,
        remove,
        {
          importance: values.importance,
          minimumProficiency: values.minimumProficiency,
          requiredForLevels: values.requiredForLevels,
        },
      );
      setDependencies(response);
      setRelationship((current) => ({ ...current, targetSkillId: "" }));
    } catch (error) {
      setStatus((current) => ({ ...current, error: error.message }));
    }
  }

  return (
    <AppShell eyebrow="Platform administration" title="Skill library">
      <div className="grid gap-7 xl:grid-cols-[.9fr_1.1fr]">
        <section className="skill-panel self-start">
          <div className="grid gap-3 sm:grid-cols-[1fr_150px]"><input className="field-input" placeholder="Search library" value={query.q} onChange={(event) => setQuery((current) => ({ ...current, q: event.target.value, page: 1 }))} /><select className="field-input" value={query.status} onChange={(event) => setQuery((current) => ({ ...current, status: event.target.value, page: 1 }))}><option value="active">Active</option><option value="inactive">Inactive</option></select></div>
          {status.loading ? <div className="profile-loading mt-4">Loading canonical skills…</div> : <div className="mt-4 max-h-[650px] space-y-2 overflow-y-auto pr-1">{result.items.map((skill) => <button key={skill.id} type="button" onClick={() => choose(skill)} className={`skill-library-row ${selected?.id === skill.id ? "skill-library-row-selected" : ""}`}><span><strong>{skill.name}</strong><small>{skillLabel(skill.category)} · {skill.status}</small></span><span>Edit →</span></button>)}</div>}
        </section>
        <div className="space-y-6">
          <form onSubmit={save} className="skill-panel">
            <div className="flex items-start justify-between gap-3"><div><p className="eyebrow">{selected ? "Edit canonical skill" : "Create canonical skill"}</p><h2 className="mt-2 font-serif text-3xl text-[#214743]">{selected?.name || "New library entry"}</h2></div>{selected && <button type="button" className="text-xs font-bold underline" onClick={() => { setSelected(null); setForm(blank); setDependencies(null); }}>New skill</button>}</div>
            {status.error && <div role="alert" className="profile-alert profile-alert-error mt-5">{status.error}</div>}{status.message && <div role="status" className="profile-alert profile-alert-success mt-5">{status.message}</div>}
            <div className="mt-5 grid gap-4 md:grid-cols-2"><label className="text-sm font-bold text-[#365753]">Name<input className="field-input mt-2" required value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} /></label><label className="text-sm font-bold text-[#365753]">Category<select className="field-input mt-2" value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}>{SKILL_CATEGORIES.map((value) => <option key={value} value={value}>{skillLabel(value)}</option>)}</select></label><label className="text-sm font-bold text-[#365753]">Subcategory<input className="field-input mt-2" value={form.subcategory} onChange={(event) => setForm((current) => ({ ...current, subcategory: event.target.value }))} /></label><label className="text-sm font-bold text-[#365753]">Difficulty<select className="field-input mt-2" value={form.difficultyLevel} onChange={(event) => setForm((current) => ({ ...current, difficultyLevel: event.target.value }))}><option value="foundational">Foundational</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option></select></label><label className="text-sm font-bold text-[#365753] md:col-span-2">Aliases, comma separated<input className="field-input mt-2" value={form.aliases} onChange={(event) => setForm((current) => ({ ...current, aliases: event.target.value }))} /></label><label className="text-sm font-bold text-[#365753] md:col-span-2">Description<textarea className="field-input mt-2 min-h-28" value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} /></label></div>
            <div className="mt-5 flex flex-wrap gap-3"><button className="primary-button" disabled={status.saving}>{status.saving ? "Saving…" : selected ? "Save skill" : "Create skill"}</button>{selected && <button type="button" className="secondary-button" onClick={toggleStatus}>{selected.status === "active" ? "Deactivate" : "Reactivate"}</button>}</div>
          </form>
          {selected && <section className="skill-panel"><p className="eyebrow">Curated relationships</p><div className="mt-4 grid gap-3 sm:grid-cols-[170px_1fr_auto]"><select className="field-input" value={relationship.relationshipType} onChange={(event) => setRelationship((current) => ({ ...current, relationshipType: event.target.value }))}><option value="related">Related skill</option><option value="prerequisite">Prerequisite</option></select><select className="field-input" value={relationship.targetSkillId} onChange={(event) => setRelationship((current) => ({ ...current, targetSkillId: event.target.value }))}><option value="">Select target skill</option>{result.items.filter((skill) => skill.id !== selected.id).map((skill) => <option key={skill.id} value={skill.id}>{skill.name}</option>)}</select><button type="button" className="primary-button" onClick={() => updateRelationship(false)}>Add</button></div>{relationship.relationshipType === "prerequisite" && <div className="relationship-settings"><label>Importance<select value={relationship.importance} onChange={(event) => setRelationship((current) => ({ ...current, importance: event.target.value }))}><option value="essential">Essential</option><option value="recommended">Recommended</option></select></label><label>Minimum proficiency<select value={relationship.minimumProficiency} onChange={(event) => setRelationship((current) => ({ ...current, minimumProficiency: event.target.value }))}>{["beginner", "intermediate", "advanced", "expert"].map((level) => <option key={level} value={level}>{skillLabel(level)}</option>)}</select></label><fieldset><legend>Applies at target levels</legend><div>{["beginner", "intermediate", "advanced", "expert"].map((level) => <label key={level}><input type="checkbox" checked={relationship.requiredForLevels.includes(level)} onChange={() => setRelationship((current) => ({ ...current, requiredForLevels: current.requiredForLevels.includes(level) ? current.requiredForLevels.filter((item) => item !== level) : [...current.requiredForLevels, level] }))} /> {skillLabel(level)}</label>)}</div><small>Leave all unchecked to apply at every level.</small></fieldset></div>}<div className="mt-5 grid gap-4 sm:grid-cols-2"><div><h3 className="text-xs font-bold uppercase tracking-wider text-[#748782]">Prerequisites</h3>{dependencies?.prerequisites?.map((skill) => { const rule = dependencies.prerequisiteRules?.find((item) => item.skillId === skill.id); return <div key={skill.id} className="admin-relationship-row"><span><strong>{skill.name}</strong><small>{rule?.importance || "essential"} · {rule?.minimumProficiency || "beginner"}+</small></span><button type="button" className="text-xs font-bold text-[#a34c3a] underline" onClick={() => updateRelationship(true, { relationshipType: "prerequisite", targetSkillId: skill.id })}>Remove</button></div>; })}</div><div><h3 className="text-xs font-bold uppercase tracking-wider text-[#748782]">Related</h3>{dependencies?.relatedSkills?.map((skill) => <div key={skill.id} className="admin-relationship-row"><span><strong>{skill.name}</strong></span><button type="button" className="text-xs font-bold text-[#a34c3a] underline" onClick={() => updateRelationship(true, { relationshipType: "related", targetSkillId: skill.id })}>Remove</button></div>)}</div></div></section>}
        </div>
      </div>
    </AppShell>
  );
}

export default AdminSkillsPage;
