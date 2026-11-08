import { useEffect, useState } from "react";
import { getSkillLibrary, runCompetencyAnalysis } from "../../services/skillApi.js";
import { PROFICIENCIES, skillLabel } from "../../utils/skillLabels.js";

function CompetencyAnalysisPanel() {
  const [search, setSearch] = useState("");
  const [matches, setMatches] = useState([]);
  const [requirements, setRequirements] = useState([]);
  const [analysis, setAnalysis] = useState(null);
  const [status, setStatus] = useState({ loading: false, error: "" });

  useEffect(() => {
    if (search.trim().length < 2) return setMatches([]);
    let active = true;
    const timer = window.setTimeout(() => {
      getSkillLibrary({ q: search, limit: 8, page: 1 })
        .then((result) => active && setMatches(result.items))
        .catch(() => active && setMatches([]));
    }, 180);
    return () => { active = false; window.clearTimeout(timer); };
  }, [search]);

  function add(skill) {
    if (requirements.some((item) => item.skill.id === skill.id)) return;
    setRequirements((current) => [...current, { skill, requiredProficiency: "intermediate" }]);
    setSearch("");
    setMatches([]);
    setAnalysis(null);
  }

  async function run(event) {
    event.preventDefault();
    if (!requirements.length) return;
    setStatus({ loading: true, error: "" });
    try {
      const selectedRequirements = requirements.map((item) => ({ skillId: item.skill.id, requiredProficiency: item.requiredProficiency }));
      setAnalysis(await runCompetencyAnalysis(selectedRequirements));
      window.sessionStorage.setItem("futurion_competency_requirements", JSON.stringify(selectedRequirements));
    } catch (error) {
      setStatus({ loading: false, error: error.message });
      return;
    }
    setStatus({ loading: false, error: "" });
  }

  return (
    <div className="grid gap-7 xl:grid-cols-[.8fr_1.2fr]">
      <section className="skill-workflow-intro xl:col-span-2"><div><p className="eyebrow">Before you compare</p><h2>Compare current skills with a career or preparation target.</h2><p>Select the skills and proficiency levels required for the direction you are considering. Results separate strengths, skills to improve, skills not yet tracked and areas where supporting information is incomplete.</p></div><dl><div><dt>Existing strength</dt><dd>Your recorded level meets the selected requirement.</dd></div><div><dt>Needs development</dt><dd>The skill is tracked below the selected level.</dd></div><div><dt>Not tracked</dt><dd>No matching skill record exists; this is not proof that you lack the ability.</dd></div><div><dt>Information needed</dt><dd>Evidence or prerequisite information is incomplete.</dd></div></dl></section>
      <form onSubmit={run} className="skill-panel self-start">
        <p className="eyebrow">Competency comparison</p>
        <h2 className="mt-2 font-serif text-3xl text-[#214743]">Define the skills to compare</h2>
        <p className="mt-3 text-sm leading-6 text-[#687b76]">Choose your own required skills and proficiency levels. Futurion will explain the calculation without predicting employability.</p>
        <label className="mt-5 block text-sm font-bold text-[#365753]">Find a required skill<input className="field-input mt-2" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search the central library" /></label>
        {matches.length > 0 && <div className="mt-2 border border-[#cbd5ce] bg-white p-2 shadow-lg">{matches.map((skill) => <button key={skill.id} type="button" onClick={() => add(skill)} className="block w-full px-3 py-2 text-left text-sm font-bold text-[#365753] hover:bg-[#edf4f0]">{skill.name} <span className="font-normal text-[#7b8b87]">· {skillLabel(skill.category)}</span></button>)}</div>}
        <div className="mt-5 space-y-3">
          {requirements.map((item, index) => <div key={item.skill.id} className="border border-[#d4ddd6] bg-[#f8f9f5] p-4"><div className="flex items-start justify-between gap-3"><strong className="text-sm text-[#294d49]">{item.skill.name}</strong><button type="button" onClick={() => { setRequirements((current) => current.filter((_, itemIndex) => itemIndex !== index)); setAnalysis(null); }} className="text-xs font-bold text-[#a34c3a] underline">Remove</button></div><select aria-label={`Required proficiency for ${item.skill.name}`} className="field-input mt-3" value={item.requiredProficiency} onChange={(event) => { setRequirements((current) => current.map((record, itemIndex) => itemIndex === index ? { ...record, requiredProficiency: event.target.value } : record)); setAnalysis(null); }}>{PROFICIENCIES.map((value) => <option key={value} value={value}>{skillLabel(value)}</option>)}</select></div>)}
          {!requirements.length && <div className="skill-empty-state"><p>No requirements selected.</p><small>Add one or more skills to create a transparent comparison.</small></div>}
        </div>
        {status.error && <div role="alert" className="profile-alert profile-alert-error mt-5">{status.error}</div>}
        <button className="primary-button mt-5 w-full" disabled={!requirements.length || status.loading}>{status.loading ? "Comparing…" : "Run competency analysis"}</button>
      </form>
      <section className="skill-panel">
        {!analysis ? <div className="grid min-h-[480px] place-items-center text-center"><div><span className="mx-auto grid size-16 place-items-center border border-[#b8c9c2] font-serif text-2xl text-[#47736a]">↗</span><h3 className="mt-5 font-serif text-3xl text-[#214743]">Your comparison will appear here</h3><p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[#748581]">It will separate missing skills, proficiency gaps, evidence gaps, and prerequisite gaps.</p></div></div> : <div>
          <div className="flex flex-col gap-5 border-b border-[#dce4de] pb-6 sm:flex-row sm:items-center"><div className="competency-score"><strong>{analysis.summary.proficiencyCoverage}%</strong><span>proficiency coverage</span></div><div><h3 className="font-serif text-3xl text-[#214743]">Competency summary</h3><p className="mt-2 text-xs leading-5 text-[#758682]">{analysis.summary.calculation}</p></div></div>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5">{[["Not tracked", analysis.summary.missingSkills], ["Needs development", analysis.summary.belowRequiredProficiency], ["Existing strengths", analysis.summary.meetingRequiredProficiency], ["Evidence information", analysis.summary.insufficientEvidence], ["Prerequisite information", analysis.summary.incompletePrerequisites]].map(([label, value]) => <div key={label} className="border border-[#dce4de] bg-[#f8f9f5] p-3 text-center"><strong className="font-serif text-2xl text-[#214743]">{value}</strong><span className="mt-1 block text-[10px] font-bold uppercase tracking-wider text-[#788985]">{label}</span></div>)}</div>
          <div className="mt-6 space-y-4">{analysis.requirements.map((item) => <article key={item.skill.id} className="competency-result"><div className="flex flex-wrap items-start justify-between gap-3"><div><h4 className="font-bold text-[#294d49]">{item.skill.name}</h4><p className="mt-1 text-xs text-[#71837f]">Required: {skillLabel(item.requiredProficiency)} · Current: {item.currentProficiency ? skillLabel(item.currentProficiency) : "Not tracked"}</p></div><span className={`skill-gap-label ${item.missing || item.belowRequired ? "skill-gap-open" : "skill-gap-met"}`}>{item.missing ? "Not tracked" : item.belowRequired ? `Develop by ${item.proficiencyGap} level${item.proficiencyGap === 1 ? "" : "s"}` : "Level met"}</span></div><div className="mt-3 flex flex-wrap gap-2">{item.insufficientEvidence && <span className="profile-chip">Evidence information needed</span>}{item.prerequisitesMissing && <span className="profile-chip">Prerequisite information needed</span>}</div><p className="mt-3 text-sm leading-6 text-[#5f746f]">{item.recommendedNextAction}</p></article>)}</div>
          <p className="mt-6 border-l-4 border-[#e9794a] bg-[#fff7f2] p-4 text-xs leading-5 text-[#765448]">{analysis.summary.disclaimer}</p>
        </div>}
      </section>
    </div>
  );
}

export default CompetencyAnalysisPanel;
