import { useEffect, useState } from "react";
import { addStudentSkill, getSkillDetails, getSkillLibrary } from "../../services/skillApi.js";
import { LEARNING_STATUSES, PROFICIENCIES, SKILL_CATEGORIES, skillLabel } from "../../utils/skillLabels.js";

const initialProgress = {
  proficiency: "beginner",
  learningStatus: "learning",
  description: "",
  notes: "",
};

function AddSkillPanel({ ownedSkillIds, onAdded, onClose }) {
  const [query, setQuery] = useState({ q: "", category: "", subcategory: "", page: 1, limit: 10 });
  const [library, setLibrary] = useState({ items: [], pagination: null });
  const [selected, setSelected] = useState(null);
  const [details, setDetails] = useState(null);
  const [progress, setProgress] = useState(initialProgress);
  const [status, setStatus] = useState({ loading: true, detailsLoading: false, detailsError: "", saving: false, error: "" });

  useEffect(() => {
    let active = true;
    setStatus((current) => ({ ...current, loading: true, error: "" }));
    const timer = window.setTimeout(() => {
      getSkillLibrary(query)
        .then((result) => active && setLibrary(result))
        .catch((error) => active && setStatus((current) => ({ ...current, error: error.message })))
        .finally(() => active && setStatus((current) => ({ ...current, loading: false })));
    }, 180);
    return () => { active = false; window.clearTimeout(timer); };
  }, [query]);

  useEffect(() => {
    if (!selected) {
      setDetails(null);
      return undefined;
    }
    let active = true;
    setStatus((current) => ({ ...current, detailsLoading: true, detailsError: "" }));
    getSkillDetails(selected.id)
      .then((result) => active && setDetails(result))
      .catch(() => active && setStatus((current) => ({ ...current, detailsError: "Relationship information is temporarily unavailable." })))
      .finally(() => active && setStatus((current) => ({ ...current, detailsLoading: false })));
    return () => { active = false; };
  }, [selected]);

  async function submit(event) {
    event.preventDefault();
    if (!selected || ownedSkillIds.has(selected.id)) return;
    setStatus((current) => ({ ...current, saving: true, error: "" }));
    try {
      const result = await addStudentSkill({ skillId: selected.id, ...progress });
      await onAdded(result.studentSkill);
      setSelected(null);
      setDetails(null);
      setProgress(initialProgress);
    } catch (error) {
      setStatus((current) => ({ ...current, error: error.message }));
    } finally {
      setStatus((current) => ({ ...current, saving: false }));
    }
  }

  const detailSkill = details?.skill || selected;
  const prerequisites = details?.prerequisites || [];
  const relatedSkills = details?.relatedSkills || [];

  return (
    <section className="skill-add-panel" aria-labelledby="add-skill-title">
      <div className="flex items-start justify-between gap-4">
        <div><p className="eyebrow">Structured skill catalogue</p><h2 id="add-skill-title" className="mt-2 font-serif text-3xl text-[#214743]">Explore the Skill Library</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-[#6d7f7b]">Browse professional and academic skills across the disciplines currently recorded in Futurion. Search by name, explore categories, read what a skill involves and add the skills that are relevant to your profile.</p></div>
        <button type="button" onClick={onClose} className="text-sm font-bold text-[#5f7470] underline underline-offset-4">Close</button>
      </div>
      <ol className="skill-add-steps" aria-label="Steps to add a skill"><li><b>1</b><span><strong>Select</strong>Search the library</span></li><li><b>2</b><span><strong>Describe</strong>Choose your proficiency</span></li><li><b>3</b><span><strong>Support</strong>Add optional context</span></li><li><b>4</b><span><strong>Confirm</strong>Add it to My Skills</span></li></ol>
      {status.error && <div role="alert" className="profile-alert profile-alert-error mt-5">{status.error}</div>}
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_.82fr]">
        <div>
          <p className="skill-library-help">Search names or aliases, then narrow the results using the category recorded for each skill. Categories may include analytical, creative, business, research, leadership, communication, domain-specific and technical skills.</p>
          <div className="skill-library-filters">
            <label className="skill-library-field">Search the library<input className="field-input" placeholder="Skill name or alias" value={query.q} onChange={(event) => setQuery((current) => ({ ...current, q: event.target.value, page: 1 }))} /></label>
            <label className="skill-library-field">Skill category<select className="field-input" value={query.category} onChange={(event) => setQuery((current) => ({ ...current, category: event.target.value, page: 1 }))}><option value="">All categories</option>{SKILL_CATEGORIES.map((category) => <option key={category} value={category}>{skillLabel(category)}</option>)}</select></label>
            <label className="skill-library-field">Domain<input className="field-input" placeholder="e.g. Healthcare" value={query.subcategory} onChange={(event) => setQuery((current) => ({ ...current, subcategory: event.target.value, page: 1 }))} /></label>
          </div>
          <div className="mt-4 space-y-2">
            {status.loading && <div className="profile-loading">Searching the skill library…</div>}
            {!status.loading && library.items.map((skill) => {
              const owned = ownedSkillIds.has(skill.id);
              return <button key={skill.id} type="button" disabled={owned} onClick={() => setSelected(skill)} className={`skill-library-row ${selected?.id === skill.id ? "skill-library-row-selected" : ""}`}><span><strong>{skill.name}</strong><small>{skillLabel(skill.category)}{skill.subcategory ? ` · ${skill.subcategory}` : ""}</small></span><span>{owned ? "Already tracked" : "Select →"}</span></button>;
            })}
            {!status.loading && !library.items.length && <div className="skill-empty-state"><p>No matching canonical skills.</p><small>Try another term or category. Students cannot create duplicate identities here.</small></div>}
          </div>
          {library.pagination && library.pagination.totalPages > 1 && <div className="mt-4 flex items-center justify-between text-xs font-bold text-[#657a75]"><button type="button" disabled={query.page === 1} onClick={() => setQuery((current) => ({ ...current, page: current.page - 1 }))}>← Previous</button><span>Page {query.page} of {library.pagination.totalPages}</span><button type="button" disabled={query.page >= library.pagination.totalPages} onClick={() => setQuery((current) => ({ ...current, page: current.page + 1 }))}>Next →</button></div>}
        </div>
        <form onSubmit={submit} className="border border-[#d4ddd6] bg-[#f8f6ef] p-5">
          {selected ? <>
            <p className="text-xs font-bold uppercase tracking-wider text-[#748782]">Selected library skill</p>
            <h3 className="mt-2 font-serif text-2xl text-[#214743]">{detailSkill.name}</h3>
            <h4 className="skill-library-subheading">What this skill involves</h4>
            <p className="mt-2 text-sm leading-6 text-[#687b76]">{detailSkill.description || "A detailed library explanation has not been provided yet."}</p>
            <dl className="skill-library-details"><div><dt>Category</dt><dd>{skillLabel(detailSkill.category)}</dd></div>{detailSkill.subcategory && <div><dt>Domain</dt><dd>{detailSkill.subcategory}</dd></div>}{detailSkill.difficultyLevel && <div><dt>Library level</dt><dd>{skillLabel(detailSkill.difficultyLevel)}</dd></div>}</dl>
            <section className="skill-library-relationships" aria-label={`Relationships for ${detailSkill.name}`}><h4>Foundations and related skills</h4>{status.detailsLoading ? <p>Loading recorded relationships…</p> : status.detailsError ? <p role="status">{status.detailsError}</p> : <div><div><strong>Prerequisites</strong><p>{prerequisites.length ? prerequisites.map((skill) => skill.name).join(", ") : "No prerequisites are recorded for this skill."}</p></div><div><strong>Related skills</strong><p>{relatedSkills.length ? relatedSkills.map((skill) => skill.name).join(", ") : "No related skills are recorded for this skill."}</p></div></div>}<small>Only relationships maintained in the Skill Library are shown.</small></section>
            <div className="mt-5 grid gap-4">
              <label className="text-sm font-bold text-[#365753]">Initial proficiency<select className="field-input mt-2" value={progress.proficiency} onChange={(event) => setProgress((current) => ({ ...current, proficiency: event.target.value }))}>{PROFICIENCIES.map((value) => <option key={value} value={value}>{skillLabel(value)}</option>)}</select></label>
              <label className="text-sm font-bold text-[#365753]">Learning status<select className="field-input mt-2" value={progress.learningStatus} onChange={(event) => setProgress((current) => ({ ...current, learningStatus: event.target.value }))}>{LEARNING_STATUSES.map((value) => <option key={value} value={value}>{skillLabel(value)}</option>)}</select></label>
              <label className="text-sm font-bold text-[#365753]">Description<textarea className="field-input mt-2 min-h-24" value={progress.description} onChange={(event) => setProgress((current) => ({ ...current, description: event.target.value }))} placeholder="How are you using or learning this skill?" /></label>
              <label className="text-sm font-bold text-[#365753]">Private notes<textarea className="field-input mt-2 min-h-20" value={progress.notes} onChange={(event) => setProgress((current) => ({ ...current, notes: event.target.value }))} /></label>
            </div>
            <button className="primary-button mt-5 w-full" disabled={status.saving}>{status.saving ? "Adding…" : "Add to my skills"}</button>
            <p className="mt-3 text-xs leading-5 text-[#7a8b87]">Adding this skill does not verify it or prove proficiency.</p>
          </> : <div className="grid min-h-72 place-items-center text-center"><div><span className="mx-auto grid size-12 place-items-center border border-[#b9c9c2] text-xl text-[#48716a]">+</span><p className="mt-4 font-serif text-2xl text-[#294d49]">Select a skill to continue</p><p className="mt-2 text-sm text-[#758682]">Its library description and progress fields will appear here.</p></div></div>}
        </form>
      </div>
    </section>
  );
}

export default AddSkillPanel;
