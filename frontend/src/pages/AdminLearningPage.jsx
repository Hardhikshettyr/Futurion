import { useCallback, useEffect, useState } from "react";
import AppShell from "../layouts/AppShell.jsx";
import {
  createLearningCategory, createLearningResource, getAdminLearningCategories,
  getAdminLearningResources, updateLearningCategory, updateLearningResource,
} from "../services/learningApi.js";
import { getSkillLibrary } from "../services/skillApi.js";

const blank = {
  title: "", description: "", resourceType: "course", provider: "", externalUrl: "",
  skillsCovered: [], prerequisites: [], difficulty: "beginner", duration: "", priceType: "unknown",
  priceAmount: "", currency: "", certificateAvailable: false, categoryId: "", status: "active",
};

const selectedValues = (event) => Array.from(event.target.selectedOptions, (option) => option.value);

function AdminLearningPage() {
  const [query, setQuery] = useState({ q: "", status: "active", page: 1, limit: 50, sort: "title_asc" });
  const [resources, setResources] = useState([]);
  const [categories, setCategories] = useState([]);
  const [skills, setSkills] = useState([]);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(blank);
  const [categoryDraft, setCategoryDraft] = useState({ name: "", description: "" });
  const [status, setStatus] = useState({ loading: true, saving: false, error: "", message: "" });

  const load = useCallback(async () => {
    setStatus((value) => ({ ...value, loading: true, error: "" }));
    try {
      const [resourceData, categoryData, skillData] = await Promise.all([
        getAdminLearningResources(query), getAdminLearningCategories(), getSkillLibrary({ status: "active", limit: 50 }),
      ]);
      setResources(resourceData.items || []); setCategories(categoryData.categories || []); setSkills(skillData.items || []);
    } catch (error) { setStatus((value) => ({ ...value, error: error.message })); }
    finally { setStatus((value) => ({ ...value, loading: false })); }
  }, [query]);
  useEffect(() => { load(); }, [load]);

  function reset() {
    setSelected(null);
    setForm({ ...blank, categoryId: categories.find((item) => item.status === "active")?.id || "" });
  }

  function choose(resource) {
    setSelected(resource);
    setForm({
      title: resource.title, description: resource.description, resourceType: resource.resourceType,
      provider: resource.provider, externalUrl: resource.externalUrl,
      skillsCovered: resource.skillsCovered.map((item) => item.id), prerequisites: resource.prerequisites.map((item) => item.id),
      difficulty: resource.difficulty, duration: resource.duration, priceType: resource.priceType,
      priceAmount: resource.priceAmount ?? "", currency: resource.currency, certificateAvailable: resource.certificateAvailable,
      categoryId: resource.category?.id || "", status: resource.status,
    });
  }

  function payload() {
    return { ...form, priceAmount: form.priceAmount === "" ? null : Number(form.priceAmount), currency: form.priceAmount === "" ? "" : form.currency.toUpperCase() };
  }

  async function save(event) {
    event.preventDefault();
    setStatus((value) => ({ ...value, saving: true, error: "", message: "" }));
    try {
      const response = selected ? await updateLearningResource(selected.id, payload()) : await createLearningResource(payload());
      setStatus((value) => ({ ...value, message: response.message })); reset(); await load();
    } catch (error) { setStatus((value) => ({ ...value, error: error.message })); }
    finally { setStatus((value) => ({ ...value, saving: false })); }
  }

  async function addCategory(event) {
    event.preventDefault();
    try { await createLearningCategory(categoryDraft); setCategoryDraft({ name: "", description: "" }); await load(); }
    catch (error) { setStatus((value) => ({ ...value, error: error.message })); }
  }

  async function toggleCategory(category) {
    try { await updateLearningCategory(category.id, { status: category.status === "active" ? "inactive" : "active" }); await load(); }
    catch (error) { setStatus((value) => ({ ...value, error: error.message })); }
  }

  return <AppShell eyebrow="Platform administration" title="Learning resource library">
    {status.error && <div role="alert" className="profile-alert profile-alert-error mb-5">{status.error}</div>}{status.message && <div role="status" className="profile-alert profile-alert-success mb-5">{status.message}</div>}
    <div className="admin-learning-layout"><aside className="skill-panel"><div className="grid gap-3 sm:grid-cols-[1fr_130px]"><input className="field-input" placeholder="Search resources" value={query.q} onChange={(event) => setQuery((value) => ({ ...value, q: event.target.value, page: 1 }))} /><select className="field-input" value={query.status} onChange={(event) => setQuery((value) => ({ ...value, status: event.target.value }))}><option value="active">Active</option><option value="inactive">Inactive</option></select></div><button type="button" className="secondary-button mt-3 w-full" onClick={reset}>Create new resource</button>{status.loading ? <div className="profile-loading mt-4">Loading resources…</div> : <div className="admin-learning-resource-list">{resources.map((resource) => <button type="button" key={resource.id} onClick={() => choose(resource)} className={selected?.id === resource.id ? "admin-learning-selected" : ""}><span><strong>{resource.title}</strong><small>{resource.provider} · {resource.status}</small></span><b>Edit →</b></button>)}</div>}<section className="admin-category-manager"><h3>Resource categories</h3><form onSubmit={addCategory}><input className="field-input" required placeholder="Category name" value={categoryDraft.name} onChange={(event) => setCategoryDraft((value) => ({ ...value, name: event.target.value }))} /><textarea className="field-input" placeholder="Short description" value={categoryDraft.description} onChange={(event) => setCategoryDraft((value) => ({ ...value, description: event.target.value }))} /><button className="secondary-button">Add category</button></form>{categories.map((category) => <div key={category.id}><span><strong>{category.name}</strong><small>{category.status}</small></span><button type="button" onClick={() => toggleCategory(category)}>{category.status === "active" ? "Deactivate" : "Activate"}</button></div>)}</section></aside>
      <form className="skill-panel admin-learning-form" onSubmit={save}><div className="learning-section-heading"><div><p className="eyebrow">{selected ? "Edit catalogue record" : "Create catalogue record"}</p><h2>{selected?.title || "New learning resource"}</h2></div>{selected && <button type="button" className="secondary-button" onClick={reset}>New resource</button>}</div><div className="grid gap-4 md:grid-cols-2"><label>Title<input className="field-input" required maxLength="220" value={form.title} onChange={(event) => setForm((value) => ({ ...value, title: event.target.value }))} /></label><label>Provider<input className="field-input" required maxLength="180" value={form.provider} onChange={(event) => setForm((value) => ({ ...value, provider: event.target.value }))} /></label><label className="md:col-span-2">Description<textarea className="field-input min-h-28" required maxLength="2400" value={form.description} onChange={(event) => setForm((value) => ({ ...value, description: event.target.value }))} /></label><label className="md:col-span-2">External HTTPS URL<input className="field-input" type="url" required value={form.externalUrl} onChange={(event) => setForm((value) => ({ ...value, externalUrl: event.target.value }))} /></label><label>Resource type<select className="field-input" value={form.resourceType} onChange={(event) => setForm((value) => ({ ...value, resourceType: event.target.value }))}>{["course", "certification", "tutorial", "book", "documentation", "university_program", "practice_platform", "other"].map((item) => <option key={item} value={item}>{item.replaceAll("_", " ")}</option>)}</select></label><label>Category<select className="field-input" required value={form.categoryId} onChange={(event) => setForm((value) => ({ ...value, categoryId: event.target.value }))}><option value="">Choose category</option>{categories.filter((item) => item.status === "active" || item.id === form.categoryId).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>Difficulty<select className="field-input" value={form.difficulty} onChange={(event) => setForm((value) => ({ ...value, difficulty: event.target.value }))}>{["beginner", "intermediate", "advanced"].map((item) => <option key={item}>{item}</option>)}</select></label><label>Duration, if known<input className="field-input" value={form.duration} onChange={(event) => setForm((value) => ({ ...value, duration: event.target.value }))} /></label><label>Price type<select className="field-input" value={form.priceType} onChange={(event) => setForm((value) => ({ ...value, priceType: event.target.value, ...(event.target.value === "free" ? { priceAmount: 0, currency: "" } : {}) }))}><option value="free">Free</option><option value="paid">Paid</option><option value="unknown">Unknown</option></select></label><div className="grid grid-cols-[1fr_100px] gap-2"><label>Amount<input className="field-input" type="number" min="0" step="0.01" disabled={form.priceType === "free"} value={form.priceAmount} onChange={(event) => setForm((value) => ({ ...value, priceAmount: event.target.value }))} /></label><label>Currency<input className="field-input" maxLength="3" disabled={form.priceType === "free" || form.priceAmount === ""} value={form.currency} onChange={(event) => setForm((value) => ({ ...value, currency: event.target.value.toUpperCase() }))} /></label></div><label>Covered Skill Library entries<select className="field-input admin-learning-multiselect" multiple value={form.skillsCovered} onChange={(event) => setForm((value) => ({ ...value, skillsCovered: selectedValues(event) }))}>{skills.map((skill) => <option key={skill.id} value={skill.id}>{skill.name}</option>)}</select></label><label>Prerequisite skills<select className="field-input admin-learning-multiselect" multiple value={form.prerequisites} onChange={(event) => setForm((value) => ({ ...value, prerequisites: selectedValues(event) }))}>{skills.map((skill) => <option key={skill.id} value={skill.id}>{skill.name}</option>)}</select></label><label>Status<select className="field-input" value={form.status} onChange={(event) => setForm((value) => ({ ...value, status: event.target.value }))}><option value="active">Active</option><option value="inactive">Inactive</option></select></label><label className="flex items-center gap-2 self-end pb-3"><input type="checkbox" checked={form.certificateAvailable} onChange={(event) => setForm((value) => ({ ...value, certificateAvailable: event.target.checked }))} /> Certificate available</label></div><button className="primary-button mt-6" disabled={status.saving || !form.categoryId}>{status.saving ? "Saving…" : selected ? "Save resource" : "Create resource"}</button></form>
    </div>
  </AppShell>;
}

export default AdminLearningPage;
