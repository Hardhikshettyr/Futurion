import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import CareerComparisonGrid from "../components/decisions/CareerComparisonGrid.jsx";
import ModuleIntroduction from "../components/ui/ModuleIntroduction.jsx";
import AppShell from "../layouts/AppShell.jsx";
import { getCareers, getCareerAiStatus, getSavedCareers } from "../services/careerApi.js";
import {
  analyzeCareerComparison, createCareerComparison, deleteCareerComparison,
  getCareerComparison, getCareerComparisons, getComparisonAiInsights,
  updateCareerComparison,
} from "../services/decisionApi.js";

const TABS = [
  ["overview", "Overview"], ["skills", "Skills"], ["education", "Education"],
  ["certifications", "Certifications"], ["preparation", "Preparation"], ["progression", "Progression"],
];

function CareerComparisonPage() {
  const [params] = useSearchParams();
  const savedSection = useRef(null);
  const skipNextAnalysis = useRef(false);
  const [library, setLibrary] = useState([]);
  const [savedCareers, setSavedCareers] = useState([]);
  const [savedComparisons, setSavedComparisons] = useState([]);
  const [librarySearch, setLibrarySearch] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [selectedComparisonId, setSelectedComparisonId] = useState(null);
  const [name, setName] = useState("My career comparison");
  const [tab, setTab] = useState("overview");
  const [analysis, setAnalysis] = useState(null);
  const [status, setStatus] = useState({ loading: true, analyzing: false, saving: false, error: "", message: "" });
  const [ai, setAi] = useState({ available: false, question: "Which of these careers aligns with my current background, and what trade-offs should I investigate?", loading: false, error: "", result: null });
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  useEffect(() => {
    let current = true;
    Promise.all([
      getCareers({ limit: 50, sort: "title_asc" }),
      getSavedCareers({ limit: 30 }),
      getCareerComparisons({ limit: 30 }),
      getCareerAiStatus(),
    ]).then(([careerData, savedData, comparisonData, aiStatus]) => {
      if (!current) return;
      setLibrary(careerData.items || []);
      setSavedCareers(savedData.items || []);
      setSavedComparisons(comparisonData.items || []);
      const preselected = (savedData.items || []).filter((item) => item.selectedForComparison).map((item) => item.career.id).slice(0, 4);
      setSelectedIds(preselected);
      setAi((value) => ({ ...value, available: aiStatus.available }));
      if (params.get("view") === "saved") window.setTimeout(() => savedSection.current?.scrollIntoView({ behavior: "smooth" }), 0);
    }).catch((error) => current && setStatus((value) => ({ ...value, error: error.message }))).finally(() => current && setStatus((value) => ({ ...value, loading: false })));
    return () => { current = false; };
  }, [params]);

  useEffect(() => {
    if (selectedIds.length < 2) { setAnalysis(null); return undefined; }
    if (skipNextAnalysis.current) { skipNextAnalysis.current = false; return undefined; }
    let current = true;
    setStatus((value) => ({ ...value, analyzing: true, error: "" }));
    analyzeCareerComparison(selectedIds).then((response) => {
      if (current) setAnalysis(response.analysis);
    }).catch((error) => current && setStatus((value) => ({ ...value, error: error.message }))).finally(() => current && setStatus((value) => ({ ...value, analyzing: false })));
    return () => { current = false; };
  }, [selectedIds]);

  function addCareer(careerId) {
    if (!careerId || selectedSet.has(careerId) || selectedIds.length >= 4) return;
    setSelectedIds((items) => [...items, careerId]);
  }

  function removeCareer(careerId) {
    setSelectedIds((items) => items.filter((id) => id !== careerId));
  }

  async function refreshSaved() {
    const response = await getCareerComparisons({ limit: 30 });
    setSavedComparisons(response.items || []);
  }

  async function saveComparison() {
    if (selectedIds.length < 2 || !name.trim()) return;
    setStatus((value) => ({ ...value, saving: true, error: "", message: "" }));
    try {
      const response = selectedComparisonId
        ? await updateCareerComparison(selectedComparisonId, { name: name.trim(), careerIds: selectedIds })
        : await createCareerComparison({ name: name.trim(), careerIds: selectedIds });
      setSelectedComparisonId(response.comparison.id);
      setStatus((value) => ({ ...value, message: response.message }));
      await refreshSaved();
    } catch (error) { setStatus((value) => ({ ...value, error: error.message })); }
    finally { setStatus((value) => ({ ...value, saving: false })); }
  }

  async function openComparison(comparisonId) {
    setStatus((value) => ({ ...value, loading: true, error: "", message: "" }));
    try {
      const response = await getCareerComparison(comparisonId);
      setSelectedComparisonId(response.comparison.id);
      setName(response.comparison.name);
      skipNextAnalysis.current = true;
      setSelectedIds(response.comparison.careerIds);
      setAnalysis(response.comparison.analysis);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) { setStatus((value) => ({ ...value, error: error.message })); }
    finally { setStatus((value) => ({ ...value, loading: false })); }
  }

  async function removeComparison(comparisonId) {
    if (!window.confirm("Delete this saved comparison?")) return;
    try {
      await deleteCareerComparison(comparisonId);
      if (selectedComparisonId === comparisonId) startNew();
      await refreshSaved();
    } catch (error) { setStatus((value) => ({ ...value, error: error.message })); }
  }

  function startNew() {
    setSelectedComparisonId(null);
    setName("My career comparison");
    setSelectedIds([]);
    setAnalysis(null);
    setAi((value) => ({ ...value, result: null, error: "" }));
  }

  async function askAi(event) {
    event.preventDefault();
    if (selectedIds.length < 2 || !ai.question.trim()) return;
    setAi((value) => ({ ...value, loading: true, error: "", result: null }));
    try {
      const response = await getComparisonAiInsights({ careerIds: selectedIds, question: ai.question.trim() });
      setAi((value) => ({ ...value, result: response.insights }));
    } catch (error) { setAi((value) => ({ ...value, error: error.message })); }
    finally { setAi((value) => ({ ...value, loading: false })); }
  }

  const savedOptions = savedCareers.filter((item) => !selectedSet.has(item.career.id));
  const normalizedLibrarySearch = librarySearch.trim().toLowerCase();
  const libraryOptions = library.filter((item) => !selectedSet.has(item.id) && (
    !normalizedLibrarySearch
    || [item.title, item.industry, item.categoryLabel, item.shortDescription]
      .filter(Boolean).join(" ").toLowerCase().includes(normalizedLibrarySearch)
  ));

  return <AppShell eyebrow="Career decision workspace" title="Compare career paths">
    <ModuleIntroduction eyebrow="Make an informed comparison" title="Career Comparison" description="Compare career paths side by side to understand differences in qualifications, skills, progression and preparation requirements." value="Choose two to four careers. Futurion compares each one independently with your recorded profile; the result supports investigation rather than selecting a winner for you." capabilities={["Select saved careers or search the library", "Compare requirements and profile alignment", "Save, reopen and print useful comparisons"]} action={{ href: "#comparison-selector", label: "Select careers to compare" }} />
    <section className="decision-hero">
      <div><p>Compare evidence, not promises</p><h2>Put career paths beside each other—and make every difference inspectable.</h2><span>Up to four careers · actual profile data · current Career Library requirements</span></div>
      <div className="decision-hero-score"><strong>{selectedIds.length}<small>/ 4 selected</small></strong><button type="button" onClick={startNew}>Start fresh</button></div>
    </section>

    {status.error && <div role="alert" className="profile-alert profile-alert-error mt-6">{status.error}</div>}
    {status.message && <div role="status" className="profile-alert profile-alert-success mt-6">{status.message}</div>}

    <section className="decision-selector" id="comparison-selector">
      <div><p className="eyebrow">Build the comparison</p><h2>Select two to four careers</h2><p>Choose from saved careers or search the complete catalogue. Duplicate selections are blocked.</p></div>
      <div className="decision-select-controls">
        <label>Saved careers<select className="field-input" value="" onChange={(event) => addCareer(event.target.value)} disabled={selectedIds.length >= 4}><option value="">Add a saved career…</option>{savedOptions.map((item) => <option key={item.career.id} value={item.career.id}>{item.career.title}</option>)}</select></label>
        <label>Career Library<input className="field-input" type="search" value={librarySearch} onChange={(event) => setLibrarySearch(event.target.value)} placeholder="Search title, industry or category…" aria-label="Search the Career Library for comparison" /><select className="field-input mt-2" value="" onChange={(event) => addCareer(event.target.value)} disabled={selectedIds.length >= 4}><option value="">{libraryOptions.length ? "Add a matching career…" : "No matching active career"}</option>{libraryOptions.map((career) => <option key={career.id} value={career.id}>{career.title} — {career.industry}</option>)}</select></label>
      </div>
      <div className="decision-selected-strip">{selectedIds.length ? selectedIds.map((id, index) => { const career = library.find((item) => item.id === id) || savedCareers.find((item) => item.career.id === id)?.career; return <button key={id} type="button" onClick={() => removeCareer(id)}><span>{String(index + 1).padStart(2, "0")}</span>{career?.title || "Selected career"}<b>×</b></button>; }) : <p>Select at least two careers to begin.</p>}</div>
      <div className="decision-save-row"><label>Comparison name<input className="field-input" maxLength="120" value={name} onChange={(event) => setName(event.target.value)} /></label><button type="button" className="primary-button" onClick={saveComparison} disabled={selectedIds.length < 2 || status.saving}>{status.saving ? "Saving…" : selectedComparisonId ? "Update comparison" : "Save comparison"}</button><button type="button" className="secondary-button" onClick={() => window.print()} disabled={!analysis}>Print / export PDF</button></div>
    </section>

    {status.loading && <div className="profile-loading mt-6">Opening your decision workspace…</div>}
    {status.analyzing && <div className="decision-analysis-loading"><span /> Recalculating every comparison dimension from your current profile…</div>}
    {!status.loading && selectedIds.length < 2 && <section className="decision-empty-workspace"><span>01 — 04</span><h2>Your comparison canvas is ready.</h2><p>Add two careers above. Futurion will retrieve their current requirements and compare them with your recorded profile and evidence.</p></section>}

    {analysis && <>
      <section className="decision-method"><div><p className="eyebrow">Transparent calculation</p><h2>Alignment is recalculated independently for every career.</h2><p>{analysis.methodology}</p></div><div className="decision-weight-grid">{Object.entries(analysis.weights).map(([key, value]) => <span key={key}><strong>{value}%</strong>{key.replaceAll(/([A-Z])/g, " $1")}</span>)}</div></section>
      <nav className="career-tabs decision-tabs" aria-label="Comparison dimensions">{TABS.map(([key, label]) => <button key={key} type="button" onClick={() => setTab(key)} className={tab === key ? "career-tab-active" : ""}>{label}</button>)}</nav>
      <CareerComparisonGrid careers={analysis.careers} tab={tab} onRemove={removeCareer} />
      <section className="decision-signals"><div><p className="eyebrow">Difference signals</p><h2>Facts to investigate—not a winner.</h2><p>{analysis.signals.explanation}</p></div><div>{[["Most current skill matches", analysis.signals.mostCurrentSkillMatches], ["Most profile evidence", analysis.signals.mostProfileEvidence], ["Fewest outstanding skill items", analysis.signals.fewestOutstandingSkillItems], ["Largest preparation set", analysis.signals.largestPreparationSet]].map(([label, ids]) => <article key={label}><span>{label}</span><strong>{ids.map((id) => analysis.careers.find((item) => item.career.id === id)?.career.title).filter(Boolean).join(" · ")}</strong></article>)}</div><small>{analysis.disclaimer}</small></section>
      <section className="decision-ai"><div><p className="eyebrow">Comparison insights</p><h2>Ask for a grounded trade-off explanation.</h2><p>This advisory review uses the structured comparison and your relevant profile context. It cannot choose a career or change records.</p></div><form onSubmit={askAi}><textarea aria-label="Comparison insights question" className="field-input min-h-28" value={ai.question} onChange={(event) => setAi((value) => ({ ...value, question: event.target.value }))} disabled={!ai.available} /><button className="primary-button" disabled={!ai.available || ai.loading}>{ai.loading ? "Comparing…" : ai.available ? "Generate comparison insights" : "Currently unavailable"}</button></form>{ai.error && <div role="alert" className="profile-alert profile-alert-error md:col-span-2">Unable to complete this request. Please try again.</div>}{ai.result && <div className="decision-ai-result"><h3>{ai.result.summary}</h3><div className="grid gap-4 lg:grid-cols-2">{ai.result.careerInsights.map((item) => { const career = analysis.careers.find((entry) => entry.career.id === item.careerId)?.career; return <article key={item.careerId}><strong>{career?.title || "Selected career"}</strong><p>{item.strongestAlignment}</p><h4>Trade-offs</h4><ul>{item.tradeoffs.map((value) => <li key={value}>{value}</li>)}</ul></article>; })}</div><h4>Questions to consider</h4><ul>{ai.result.questionsToConsider.map((value) => <li key={value}>{value}</li>)}</ul></div>}</section>
    </>}

    <section ref={savedSection} id="saved-comparisons" className="decision-saved-section"><div><p className="eyebrow">Saved comparisons</p><h2>Reopen a decision workspace</h2></div>{savedComparisons.length ? <div className="decision-saved-grid">{savedComparisons.map((comparison) => <article key={comparison.id}><small>{new Date(comparison.updatedAt).toLocaleDateString()}</small><h3>{comparison.name}</h3><p>{comparison.careers.map((career) => career.title || "Unavailable career").join(" · ")}</p><div><button type="button" onClick={() => openComparison(comparison.id)}>Open comparison</button><button type="button" onClick={() => removeComparison(comparison.id)}>Delete</button></div></article>)}</div> : <div className="career-empty">No saved comparisons yet. Build one above and give it a useful name.</div>}</section>
  </AppShell>;
}

export default CareerComparisonPage;
