import { useCallback, useEffect, useMemo, useState } from "react";
import { getStudentSkills, removeStudentSkill } from "../../services/skillApi.js";
import { EVIDENCE_STATUSES, PROFICIENCIES, SKILL_CATEGORIES, skillLabel } from "../../utils/skillLabels.js";
import AddSkillPanel from "./AddSkillPanel.jsx";
import SkillDetailPanel from "./SkillDetailPanel.jsx";

function MySkillsPanel({ onMutation, initialLibraryOpen = false }) {
  const [query, setQuery] = useState({ q: "", category: "", proficiency: "", evidenceStatus: "", sort: "updated_desc", page: 1, limit: 12 });
  const [result, setResult] = useState({ items: [], pagination: null });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [adding, setAdding] = useState(initialLibraryOpen);
  const [selected, setSelected] = useState(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      setResult(await getStudentSkills(query));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsLoading(false);
    }
  }, [query]);

  useEffect(() => {
    const timer = window.setTimeout(load, 180);
    return () => window.clearTimeout(timer);
  }, [load]);

  const ownedSkillIds = useMemo(() => new Set(result.items.map((item) => item.skill.id)), [result.items]);

  async function changed() {
    await Promise.all([load(), onMutation()]);
  }

  async function remove(record) {
    if (!window.confirm(`Remove ${record.skill.name} from your tracked skills?`)) return;
    try {
      await removeStudentSkill(record.id);
      if (selected?.id === record.id) setSelected(null);
      await changed();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  function filter(key, value) {
    setQuery((current) => ({ ...current, [key]: value, page: 1 }));
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div><p className="eyebrow">My skills</p><h2 className="mt-2 font-serif text-3xl text-[#214743]">A competency record you control</h2></div>
        <button type="button" className="primary-button" onClick={() => setAdding((value) => !value)}>{adding ? "Close library" : "+ Add skill"}</button>
      </div>
      {adding && <AddSkillPanel ownedSkillIds={ownedSkillIds} onClose={() => setAdding(false)} onAdded={async () => { setAdding(false); await changed(); }} />}
      {selected && <SkillDetailPanel key={selected.id} initialRecord={selected} onClose={() => setSelected(null)} onChanged={async (updated) => { setSelected(updated); await changed(); }} />}
      <section className="skill-panel">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <label className="xl:col-span-2"><span className="sr-only">Search tracked skills</span><input className="field-input" placeholder="Search my skills" value={query.q} onChange={(event) => filter("q", event.target.value)} /></label>
          <label><span className="sr-only">Category</span><select className="field-input" value={query.category} onChange={(event) => filter("category", event.target.value)}><option value="">All categories</option>{SKILL_CATEGORIES.map((value) => <option key={value} value={value}>{skillLabel(value)}</option>)}</select></label>
          <label><span className="sr-only">Proficiency</span><select className="field-input" value={query.proficiency} onChange={(event) => filter("proficiency", event.target.value)}><option value="">All proficiencies</option>{PROFICIENCIES.map((value) => <option key={value} value={value}>{skillLabel(value)}</option>)}</select></label>
          <label><span className="sr-only">Evidence status</span><select className="field-input" value={query.evidenceStatus} onChange={(event) => filter("evidenceStatus", event.target.value)}><option value="">All evidence</option>{EVIDENCE_STATUSES.map((value) => <option key={value} value={value}>{skillLabel(value)}</option>)}</select></label>
          <label><span className="sr-only">Sort</span><select className="field-input" value={query.sort} onChange={(event) => filter("sort", event.target.value)}><option value="updated_desc">Recently updated</option><option value="name_asc">Name A–Z</option><option value="proficiency_desc">Highest proficiency</option></select></label>
        </div>
      </section>
      {error && <div role="alert" className="profile-alert profile-alert-error">{error}<button type="button" className="ml-2 font-bold underline" onClick={load}>Try again</button></div>}
      {isLoading ? <div className="profile-loading">Loading your skill records…</div> : <>
        <section className="skill-card-grid">
          {result.items.map((record) => (
            <article key={record.id} className="skill-card">
              <div className="flex items-start justify-between gap-4"><span className="skill-category-mark">{skillLabel(record.skill.category)}</span><span className={`skill-status skill-status-${record.evidenceStatus}`}>{skillLabel(record.evidenceStatus)}</span></div>
              <h3 className="mt-5 font-serif text-2xl text-[#214743]">{record.skill.name}</h3>
              <p className="mt-2 line-clamp-2 min-h-10 text-sm leading-5 text-[#6c7e79]">{record.description || record.skill.description || "No personal context added yet."}</p>
              <dl className="mt-5 grid grid-cols-2 gap-3 border-y border-[#e0e6e1] py-4 text-xs"><div><dt className="text-[#82918e]">Proficiency</dt><dd className="mt-1 font-bold text-[#365753]">{skillLabel(record.proficiency)}</dd></div><div><dt className="text-[#82918e]">Learning</dt><dd className="mt-1 font-bold text-[#365753]">{skillLabel(record.learningStatus)}</dd></div><div><dt className="text-[#82918e]">Evidence</dt><dd className="mt-1 font-bold text-[#365753]">{record.evidenceCount} record{record.evidenceCount === 1 ? "" : "s"}</dd></div><div><dt className="text-[#82918e]">Updated</dt><dd className="mt-1 font-bold text-[#365753]">{new Date(record.updatedAt).toLocaleDateString()}</dd></div></dl>
              <div className="mt-4 flex items-center justify-between gap-3"><button type="button" className="text-sm font-bold text-[#174b47] underline decoration-[#e9794a] decoration-2 underline-offset-4" onClick={() => setSelected(record)}>View details</button><button type="button" className="text-xs font-bold text-[#a34c3a] underline underline-offset-4" onClick={() => remove(record)}>Remove</button></div>
            </article>
          ))}
        </section>
        {!result.items.length && <div className="skill-empty-state py-12"><p className="font-serif text-3xl">No skills match this view.</p><small>Clear filters or add a canonical skill from the library.</small><button type="button" className="primary-button mt-5" onClick={() => setAdding(true)}>Browse skill library</button></div>}
        {result.pagination && result.pagination.totalPages > 1 && <div className="flex items-center justify-between border-t border-[#d4ddd6] pt-5 text-sm font-bold text-[#5e7470]"><button type="button" disabled={query.page === 1} onClick={() => setQuery((current) => ({ ...current, page: current.page - 1 }))}>← Previous</button><span>Page {query.page} of {result.pagination.totalPages}</span><button type="button" disabled={query.page >= result.pagination.totalPages} onClick={() => setQuery((current) => ({ ...current, page: current.page + 1 }))}>Next →</button></div>}
      </>}
    </div>
  );
}

export default MySkillsPanel;
