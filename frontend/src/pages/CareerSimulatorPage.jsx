import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import ScenarioAnalysisPanel from "../components/decisions/ScenarioAnalysisPanel.jsx";
import ScenarioComparisonGrid from "../components/decisions/ScenarioComparisonGrid.jsx";
import ModuleIntroduction from "../components/ui/ModuleIntroduction.jsx";
import AppShell from "../layouts/AppShell.jsx";
import { getCareers, getCareerAiStatus } from "../services/careerApi.js";
import {
  compareCareerScenarios, createCareerScenario, deleteCareerScenario,
  duplicateCareerScenario, getCareerScenarios, getScenarioAiInsights,
  previewCareerScenario, updateCareerScenario,
} from "../services/decisionApi.js";
import { getSkillLibrary } from "../services/skillApi.js";

const PREFERENCES = ["structured_courses", "project_based", "mentoring", "self_directed", "peer_learning", "mixed"];
const blankScenario = {
  name: "My career scenario",
  description: "",
  targetCareerId: "",
  startingPointType: "existing_profile",
  hypotheticalSkills: [],
  hypotheticalQualifications: [],
  weeklyLearningHours: 5,
  learningPreferences: ["mixed"],
  targetDate: "",
  constraints: "",
  status: "active",
};

function scenarioPayload(form) {
  return { ...form, weeklyLearningHours: Number(form.weeklyLearningHours), targetDate: form.targetDate || null };
}

function CareerSimulatorPage() {
  const [params] = useSearchParams();
  const savedSection = useRef(null);
  const [careers, setCareers] = useState([]);
  const [skills, setSkills] = useState([]);
  const [scenarios, setScenarios] = useState([]);
  const [form, setForm] = useState(blankScenario);
  const [selectedScenarioId, setSelectedScenarioId] = useState(null);
  const [qualificationDraft, setQualificationDraft] = useState("");
  const [skillDraft, setSkillDraft] = useState("");
  const [analysis, setAnalysis] = useState(null);
  const [comparisonIds, setComparisonIds] = useState([]);
  const [comparison, setComparison] = useState(null);
  const [status, setStatus] = useState({ loading: true, analyzing: false, saving: false, error: "", message: "" });
  const [ai, setAi] = useState({ available: false, question: "What assumptions and preparation trade-offs should I reconsider in these scenarios?", loading: false, error: "", result: null });
  const payload = useMemo(() => scenarioPayload(form), [form]);

  async function refreshScenarios() {
    const response = await getCareerScenarios({ limit: 30 });
    setScenarios(response.items || []);
  }

  useEffect(() => {
    let current = true;
    Promise.all([
      getCareers({ limit: 50, sort: "title_asc" }),
      getSkillLibrary({ status: "active", limit: 50 }),
      getCareerScenarios({ limit: 30 }),
      getCareerAiStatus(),
    ]).then(([careerData, skillData, scenarioData, aiStatus]) => {
      if (!current) return;
      setCareers(careerData.items || []);
      setSkills(skillData.items || []);
      setScenarios(scenarioData.items || []);
      setAi((value) => ({ ...value, available: aiStatus.available }));
      if (params.get("view") === "saved") window.setTimeout(() => savedSection.current?.scrollIntoView({ behavior: "smooth" }), 0);
    }).catch((error) => current && setStatus((value) => ({ ...value, error: error.message }))).finally(() => current && setStatus((value) => ({ ...value, loading: false })));
    return () => { current = false; };
  }, [params]);

  useEffect(() => {
    if (!payload.targetCareerId || !payload.name.trim() || !payload.learningPreferences.length) { setAnalysis(null); return undefined; }
    let current = true;
    const timer = window.setTimeout(() => {
      setStatus((value) => ({ ...value, analyzing: true, error: "" }));
      previewCareerScenario(payload).then((response) => {
        if (current) setAnalysis(response.analysis);
      }).catch((error) => current && setStatus((value) => ({ ...value, error: error.message }))).finally(() => current && setStatus((value) => ({ ...value, analyzing: false })));
    }, 550);
    return () => { current = false; window.clearTimeout(timer); };
  }, [payload]);

  function addSkill() {
    if (!skillDraft || form.hypotheticalSkills.some((item) => item.skillId === skillDraft)) return;
    setForm((value) => ({ ...value, hypotheticalSkills: [...value.hypotheticalSkills, { skillId: skillDraft, proficiency: "beginner" }] }));
    setSkillDraft("");
  }

  function addQualification() {
    const value = qualificationDraft.trim();
    if (!value || form.hypotheticalQualifications.some((item) => item.toLowerCase() === value.toLowerCase())) return;
    setForm((current) => ({ ...current, hypotheticalQualifications: [...current.hypotheticalQualifications, value] }));
    setQualificationDraft("");
  }

  function togglePreference(preference) {
    setForm((value) => {
      const included = value.learningPreferences.includes(preference);
      if (included && value.learningPreferences.length === 1) return value;
      return { ...value, learningPreferences: included ? value.learningPreferences.filter((item) => item !== preference) : [...value.learningPreferences, preference] };
    });
  }

  function resetToActual() {
    setForm((value) => ({ ...value, startingPointType: "existing_profile", hypotheticalSkills: [], hypotheticalQualifications: [] }));
    setStatus((value) => ({ ...value, message: "Scenario overrides cleared. Your real profile was not changed." }));
  }

  async function saveScenario() {
    if (!payload.targetCareerId || !payload.name.trim()) return;
    setStatus((value) => ({ ...value, saving: true, error: "", message: "" }));
    try {
      const response = selectedScenarioId
        ? await updateCareerScenario(selectedScenarioId, payload)
        : await createCareerScenario(payload);
      setSelectedScenarioId(response.scenario.id);
      setStatus((value) => ({ ...value, message: response.message }));
      await refreshScenarios();
    } catch (error) { setStatus((value) => ({ ...value, error: error.message })); }
    finally { setStatus((value) => ({ ...value, saving: false })); }
  }

  function newScenario() {
    setSelectedScenarioId(null);
    setForm(blankScenario);
    setAnalysis(null);
    setComparison(null);
    setAi((value) => ({ ...value, result: null, error: "" }));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openScenario(scenario) {
    setSelectedScenarioId(scenario.id);
    setForm({
      name: scenario.name,
      description: scenario.description,
      targetCareerId: scenario.targetCareer.id,
      startingPointType: scenario.startingPointType,
      hypotheticalSkills: scenario.hypotheticalSkills.map((item) => ({ skillId: item.skillId, proficiency: item.proficiency })),
      hypotheticalQualifications: scenario.hypotheticalQualifications,
      weeklyLearningHours: scenario.weeklyLearningHours,
      learningPreferences: scenario.learningPreferences,
      targetDate: scenario.targetDate ? String(scenario.targetDate).slice(0, 10) : "",
      constraints: scenario.constraints,
      status: scenario.status,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function archiveScenario(scenario) {
    try {
      await updateCareerScenario(scenario.id, { status: scenario.status === "active" ? "archived" : "active" });
      if (scenario.status === "active") setComparisonIds((ids) => ids.filter((id) => id !== scenario.id));
      await refreshScenarios();
      if (selectedScenarioId === scenario.id) setForm((value) => ({ ...value, status: scenario.status === "active" ? "archived" : "active" }));
    } catch (error) { setStatus((value) => ({ ...value, error: error.message })); }
  }

  async function copyScenario(scenario) {
    try { await duplicateCareerScenario(scenario.id); await refreshScenarios(); }
    catch (error) { setStatus((value) => ({ ...value, error: error.message })); }
  }

  async function removeScenario(scenario) {
    if (!window.confirm(`Delete “${scenario.name}”?`)) return;
    try {
      await deleteCareerScenario(scenario.id);
      setComparisonIds((ids) => ids.filter((id) => id !== scenario.id));
      if (selectedScenarioId === scenario.id) newScenario();
      await refreshScenarios();
    } catch (error) { setStatus((value) => ({ ...value, error: error.message })); }
  }

  function toggleCompareScenario(scenarioId) {
    setComparisonIds((ids) => ids.includes(scenarioId) ? ids.filter((id) => id !== scenarioId) : ids.length < 4 ? [...ids, scenarioId] : ids);
  }

  async function runScenarioComparison() {
    if (comparisonIds.length < 2) return;
    setStatus((value) => ({ ...value, analyzing: true, error: "" }));
    try { const response = await compareCareerScenarios(comparisonIds); setComparison(response.comparison); }
    catch (error) { setStatus((value) => ({ ...value, error: error.message })); }
    finally { setStatus((value) => ({ ...value, analyzing: false })); }
  }

  async function askAi(event) {
    event.preventDefault();
    const scenarioIds = comparisonIds.length ? comparisonIds : selectedScenarioId && form.status === "active" ? [selectedScenarioId] : [];
    if (!scenarioIds.length || !ai.question.trim()) return;
    setAi((value) => ({ ...value, loading: true, error: "", result: null }));
    try {
      const response = await getScenarioAiInsights({ scenarioIds, question: ai.question.trim() });
      setAi((value) => ({ ...value, result: response.insights }));
    } catch (error) { setAi((value) => ({ ...value, error: error.message })); }
    finally { setAi((value) => ({ ...value, loading: false })); }
  }

  const skillName = (skillId) => skills.find((item) => item.id === skillId)?.name || "Library skill";
  return <AppShell eyebrow="Career decision workspace" title="Scenario simulator">
    <ModuleIntroduction eyebrow="Explore without changing your records" title="Scenario Simulator" description="Test hypothetical changes to skills, qualifications and available learning time to understand how different preparation plans could affect a career direction." value="Scenario values remain separate from your actual profile. Save alternatives, compare their trade-offs and return to them whenever your plans change." capabilities={["Create a hypothetical career scenario", "Adjust skills, qualifications and weekly learning time", "Save and compare different preparation strategies"]} action={{ href: "#scenario-builder", label: "Create a scenario" }} />
    <section className="scenario-hero"><div><p>Change assumptions, not your profile</p><h2>Test a preparation strategy before you commit to it.</h2><span>Actual profile baseline + isolated hypothetical overrides + current Career Library requirements</span></div><button type="button" onClick={newScenario}>New scenario</button></section>
    {status.error && <div role="alert" className="profile-alert profile-alert-error mt-6">{status.error}</div>}
    {status.message && <div role="status" className="profile-alert profile-alert-success mt-6">{status.message}</div>}

    <div className="scenario-workspace" id="scenario-builder">
      <section className="scenario-editor">
        <div className="scenario-editor-heading"><div><p className="eyebrow">Scenario inputs</p><h2>{selectedScenarioId ? "Edit saved scenario" : "Create a new scenario"}</h2></div><span className={form.status === "archived" ? "scenario-badge-archived" : "scenario-badge"}>{form.status}</span></div>
        <div className="scenario-origin-note"><span>ACTUAL</span> Your real profile remains read-only. <b>HYPOTHETICAL</b> fields below exist only in this scenario.</div>
        <div className="grid gap-4 sm:grid-cols-2"><label className="scenario-field">Scenario name<input className="field-input" value={form.name} maxLength="120" onChange={(event) => setForm((value) => ({ ...value, name: event.target.value }))} /></label><label className="scenario-field">Target career<select className="field-input" value={form.targetCareerId} onChange={(event) => setForm((value) => ({ ...value, targetCareerId: event.target.value }))}><option value="">Choose a Career Library record…</option>{careers.map((career) => <option key={career.id} value={career.id}>{career.title} — {career.industry}</option>)}</select></label></div>
        <label className="scenario-field">Personal objective<textarea className="field-input min-h-20" value={form.description} onChange={(event) => setForm((value) => ({ ...value, description: event.target.value }))} placeholder="What decision or preparation strategy are you exploring?" /></label>
        <fieldset className="scenario-choice"><legend>Starting point</legend><label className={form.startingPointType === "existing_profile" ? "scenario-choice-active" : ""}><input type="radio" name="startingPoint" checked={form.startingPointType === "existing_profile"} onChange={() => setForm((value) => ({ ...value, startingPointType: "existing_profile" }))} /><strong>Existing profile</strong><small>Begin with your recorded education, skills, projects and experience.</small></label><label className={form.startingPointType === "custom_hypothetical" ? "scenario-choice-active" : ""}><input type="radio" name="startingPoint" checked={form.startingPointType === "custom_hypothetical"} onChange={() => setForm((value) => ({ ...value, startingPointType: "custom_hypothetical" }))} /><strong>Custom hypothetical</strong><small>Begin only with the scenario skills and qualifications you add below.</small></label></fieldset>

        <section className="scenario-input-block"><div><span>HYPOTHETICAL</span><h3>Skill proficiency changes</h3><p>Add a possible future skill or override its proficiency inside this scenario.</p></div><div className="flex gap-2"><select className="field-input" value={skillDraft} onChange={(event) => setSkillDraft(event.target.value)}><option value="">Choose a central Skill Library skill…</option>{skills.filter((skill) => !form.hypotheticalSkills.some((item) => item.skillId === skill.id)).map((skill) => <option key={skill.id} value={skill.id}>{skill.name}</option>)}</select><button type="button" className="secondary-button" onClick={addSkill}>Add</button></div><div className="mt-3 space-y-2">{form.hypotheticalSkills.map((item) => <div className="scenario-skill-override" key={item.skillId}><span><strong>{skillName(item.skillId)}</strong><small>Scenario-only proficiency</small></span><select value={item.proficiency} onChange={(event) => setForm((value) => ({ ...value, hypotheticalSkills: value.hypotheticalSkills.map((entry) => entry.skillId === item.skillId ? { ...entry, proficiency: event.target.value } : entry) }))}>{["beginner", "intermediate", "advanced", "expert"].map((level) => <option key={level}>{level}</option>)}</select><button type="button" onClick={() => setForm((value) => ({ ...value, hypotheticalSkills: value.hypotheticalSkills.filter((entry) => entry.skillId !== item.skillId) }))}>Remove</button></div>)}</div></section>

        <section className="scenario-input-block"><div><span>HYPOTHETICAL</span><h3>Additional qualifications</h3><p>These are assumptions to explore, not qualifications recorded as earned.</p></div><div className="flex gap-2"><input className="field-input" value={qualificationDraft} onChange={(event) => setQualificationDraft(event.target.value)} placeholder="e.g. Postgraduate certificate under consideration" onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addQualification(); } }} /><button type="button" className="secondary-button" onClick={addQualification}>Add</button></div><div className="mt-3 flex flex-wrap gap-2">{form.hypotheticalQualifications.map((item) => <button type="button" className="scenario-qualification-chip" key={item} onClick={() => setForm((value) => ({ ...value, hypotheticalQualifications: value.hypotheticalQualifications.filter((entry) => entry !== item) }))}>{item} ×</button>)}</div></section>

        <section className="scenario-planning-grid"><label className="scenario-field">Weekly learning capacity <strong>{form.weeklyLearningHours} hours</strong><input type="range" min="1" max="40" value={form.weeklyLearningHours} onChange={(event) => setForm((value) => ({ ...value, weeklyLearningHours: Number(event.target.value) }))} /></label><label className="scenario-field">Optional target date<input className="field-input" type="date" value={form.targetDate} onChange={(event) => setForm((value) => ({ ...value, targetDate: event.target.value }))} /></label></section>
        <fieldset className="scenario-preferences"><legend>Preferred learning approaches</legend>{PREFERENCES.map((item) => <label key={item} className={form.learningPreferences.includes(item) ? "scenario-preference-active" : ""}><input type="checkbox" checked={form.learningPreferences.includes(item)} onChange={() => togglePreference(item)} />{item.replaceAll("_", " ")}</label>)}</fieldset>
        <label className="scenario-field">Constraints or preferences<textarea className="field-input min-h-24" value={form.constraints} onChange={(event) => setForm((value) => ({ ...value, constraints: event.target.value }))} placeholder="Budget, location, accessibility, work schedule, or other constraints to keep visible" /></label>
        <div className="scenario-editor-actions"><button type="button" className="primary-button" disabled={!form.targetCareerId || status.saving} onClick={saveScenario}>{status.saving ? "Saving…" : selectedScenarioId ? "Save changes" : "Save scenario"}</button><button type="button" className="secondary-button" onClick={resetToActual}>Reset overrides to actual profile</button></div>
      </section>

      <aside className="scenario-analysis-side">{status.analyzing && <div className="decision-analysis-loading"><span /> Recalculating scenario…</div>}{analysis ? <ScenarioAnalysisPanel analysis={analysis} /> : <div className="decision-empty-workspace"><span>ACTUAL → HYPOTHETICAL</span><h2>Choose a target career.</h2><p>Your actual baseline and scenario-only changes will remain visually separated here.</p></div>}</aside>
    </div>

    <section ref={savedSection} id="saved-scenarios" className="decision-saved-section"><div><p className="eyebrow">Saved scenarios</p><h2>Reopen, duplicate, archive or compare</h2><p>Select two to four active scenarios to compare preparation strategies.</p></div>{scenarios.length ? <div className="scenario-saved-list">{scenarios.map((scenario) => <article key={scenario.id} className={scenario.status === "archived" ? "scenario-saved-archived" : ""}><label><input type="checkbox" disabled={scenario.status !== "active"} checked={comparisonIds.includes(scenario.id)} onChange={() => toggleCompareScenario(scenario.id)} /><span>Compare</span></label><div><small>{scenario.status} · {scenario.startingPointType.replaceAll("_", " ")}</small><h3>{scenario.name}</h3><p>{scenario.targetCareer.title}</p><span>{scenario.hypotheticalSkills.length} skill change(s) · {scenario.weeklyLearningHours} hours/week</span></div><div><button type="button" onClick={() => openScenario(scenario)}>Open</button><button type="button" onClick={() => copyScenario(scenario)}>Duplicate</button><button type="button" onClick={() => archiveScenario(scenario)}>{scenario.status === "active" ? "Archive" : "Reactivate"}</button><button type="button" onClick={() => removeScenario(scenario)}>Delete</button></div></article>)}</div> : <div className="career-empty">No saved scenarios yet. Configure a target and save your first decision experiment.</div>}<div className="mt-5 flex flex-wrap items-center gap-3"><button type="button" className="primary-button" disabled={comparisonIds.length < 2 || status.analyzing} onClick={runScenarioComparison}>Compare {comparisonIds.length || "selected"} scenarios</button><small className="text-[#687c78]">{comparisonIds.length}/4 selected</small></div></section>

    {comparison && <section className="scenario-comparison-section"><div><p className="eyebrow">Scenario comparison</p><h2>Preparation strategies side by side</h2><p>{comparison.methodology}</p></div><ScenarioComparisonGrid comparison={comparison} /><div className="decision-signals"><div><p className="eyebrow">Decision signals</p><h2>No universal winner</h2><p>{comparison.signals.explanation}</p></div><div>{[["Builds most on current background", comparison.signals.buildsMostOnCurrentBackground], ["Fewest remaining skill gaps", comparison.signals.fewestRemainingSkillGaps], ["Largest hypothetical change", comparison.signals.largestHypotheticalChange]].map(([label, ids]) => <article key={label}><span>{label}</span><strong>{ids.map((id) => comparison.scenarios.find((item) => item.scenario.id === id)?.scenario.name).filter(Boolean).join(" · ")}</strong></article>)}</div><small>{comparison.disclaimer}</small></div></section>}

    <section className="decision-ai"><div><p className="eyebrow">Scenario insights</p><h2>Interrogate assumptions and trade-offs.</h2><p>Select saved scenarios above—or save the open active scenario—then request an explanation of the structured differences without choosing for you.</p></div><form onSubmit={askAi}><textarea aria-label="Scenario insights question" className="field-input min-h-28" value={ai.question} onChange={(event) => setAi((value) => ({ ...value, question: event.target.value }))} disabled={!ai.available} /><button className="primary-button" disabled={!ai.available || ai.loading || (!comparisonIds.length && (!selectedScenarioId || form.status !== "active"))}>{ai.loading ? "Reviewing…" : ai.available ? "Generate scenario insights" : "Currently unavailable"}</button></form>{ai.error && <div role="alert" className="profile-alert profile-alert-error md:col-span-2">Unable to complete this request. Please try again.</div>}{ai.result && <div className="decision-ai-result"><h3>{ai.result.summary}</h3><div className="grid gap-4 lg:grid-cols-2">{ai.result.scenarioInsights.map((item) => { const scenario = scenarios.find((entry) => entry.id === item.scenarioId); return <article key={item.scenarioId}><strong>{scenario?.name || "Saved scenario"}</strong><h4>Assumptions</h4><ul>{item.hypotheticalAssumptions.map((value) => <li key={value}>{value}</li>)}</ul><h4>Preparation trade-offs</h4><ul>{item.preparationTradeoffs.map((value) => <li key={value}>{value}</li>)}</ul></article>; })}</div><h4>Questions to consider</h4><ul>{ai.result.questionsToConsider.map((value) => <li key={value}>{value}</li>)}</ul></div>}</section>
  </AppShell>;
}

export default CareerSimulatorPage;
