import { useCallback, useEffect, useMemo, useState } from "react";
import CareerCard from "../components/careers/CareerCard.jsx";
import ModuleIntroduction from "../components/ui/ModuleIntroduction.jsx";
import AppShell from "../layouts/AppShell.jsx";
import {
  exploreCareersWithAi, getCareerAiStatus, getCareerCategories, getCareerRecommendations,
  getCareers, getRecentlyViewedCareers, getSavedCareers, removeSavedCareer, saveCareer,
  setCareerComparison,
} from "../services/careerApi.js";
import { getSkillLibrary } from "../services/skillApi.js";

const initialFilters = { q: "", category: "", industry: "", education: "", discipline: "", skillId: "", workMode: "", employmentType: "", sort: "featured", page: 1, limit: 12 };

function Shelf({ title, subtitle, children }) {
  return <section className="career-shelf"><div className="mb-5"><p className="eyebrow">{subtitle}</p><h2 className="mt-2 font-serif text-3xl text-[#173f3c]">{title}</h2></div>{children}</section>;
}

function CareerExplorerPage() {
  const [filters, setFilters] = useState(initialFilters);
  const [catalogue, setCatalogue] = useState({ items: [], pagination: {} });
  const [categories, setCategories] = useState({ categories: [], industries: [] });
  const [recommendations, setRecommendations] = useState([]);
  const [saved, setSaved] = useState([]);
  const [recent, setRecent] = useState([]);
  const [skillOptions, setSkillOptions] = useState([]);
  const [status, setStatus] = useState({ loading: true, error: "" });
  const [ai, setAi] = useState({ available: false, question: "", loading: false, error: "", result: null });
  const savedById = useMemo(() => new Map(saved.map((item) => [item.career.id, item])), [saved]);

  const loadCatalogue = useCallback(async () => {
    setStatus((current) => ({ ...current, loading: true, error: "" }));
    try { setCatalogue(await getCareers(filters)); }
    catch (error) { setStatus((current) => ({ ...current, error: error.message })); }
    finally { setStatus((current) => ({ ...current, loading: false })); }
  }, [filters]);

  const loadShelves = useCallback(async () => {
    try {
      const [categoryData, recommendationData, savedData, recentData, aiStatus, skillData] = await Promise.all([
        getCareerCategories(), getCareerRecommendations(), getSavedCareers({ limit: 6 }),
        getRecentlyViewedCareers({ limit: 6 }), getCareerAiStatus(), getSkillLibrary({ status: "active", limit: 50 }),
      ]);
      setCategories(categoryData);
      setRecommendations(recommendationData.recommendations || []);
      setSaved(savedData.items || []);
      setRecent(recentData.items || []);
      setSkillOptions(skillData.items || []);
      setAi((current) => ({ ...current, available: aiStatus.available }));
    } catch (error) { setStatus((current) => ({ ...current, error: error.message })); }
  }, []);

  useEffect(() => { loadCatalogue(); }, [loadCatalogue]);
  useEffect(() => { loadShelves(); }, [loadShelves]);

  async function toggleSaved(career, isSaved) {
    try {
      if (isSaved) await removeSavedCareer(career.id); else await saveCareer(career.id);
      const data = await getSavedCareers({ limit: 6 });
      setSaved(data.items || []);
    } catch (error) { setStatus((current) => ({ ...current, error: error.message })); }
  }

  async function toggleCompare(career, value) {
    try {
      await setCareerComparison(career.id, value);
      setSaved((items) => items.map((item) => item.career.id === career.id ? { ...item, selectedForComparison: value } : item));
    } catch (error) { setStatus((current) => ({ ...current, error: error.message })); }
  }

  async function askAi(event) {
    event.preventDefault();
    if (!ai.question.trim() || ai.loading) return;
    setAi((current) => ({ ...current, loading: true, error: "", result: null }));
    try {
      const response = await exploreCareersWithAi(ai.question);
      setAi((current) => ({ ...current, result: response.result }));
    } catch (error) { setAi((current) => ({ ...current, error: error.message })); }
    finally { setAi((current) => ({ ...current, loading: false })); }
  }

  return (
    <AppShell eyebrow="Career discovery" title="Explore your possible paths">
      <ModuleIntroduction eyebrow="Discover possibilities" title="Career Discovery" description="Explore career paths across different disciplines and understand the qualifications, skills and preparation each direction may require." value="Search broadly, open a career to study its progression and requirements, then save the paths you want to investigate further." capabilities={["Search and filter the Career Library", "Review qualifications, skills and progression", "Save careers and understand personalized recommendations"]} action={{ href: "#career-search", label: "Start exploring careers" }} />
      <section className="career-explorer-hero" id="career-search">
        <div className="relative z-10 max-w-3xl"><p className="text-xs font-extrabold uppercase tracking-[.18em] text-[#f2a078]">Evidence before assumptions</p><h2 className="mt-4 max-w-2xl font-serif text-4xl leading-tight text-white sm:text-5xl">A career catalogue that starts with possibility, then shows the preparation.</h2><p className="mt-5 max-w-2xl text-sm leading-7 text-[#c5d9d4]">Search across disciplines, compare your profile with real library requirements, and investigate alternative pathways without treating your degree as a boundary.</p></div>
        <form onSubmit={(event) => { event.preventDefault(); setFilters((current) => ({ ...current, page: 1 })); }} className="relative z-10 mt-8 flex max-w-3xl flex-col gap-2 sm:flex-row"><input aria-label="Search careers" className="min-h-14 flex-1 border border-white/20 bg-white px-4 text-[#17363a] outline-none focus:border-[#f19a69]" placeholder="Try “research”, “finance”, or “creative technology”" value={filters.q} onChange={(event) => setFilters((current) => ({ ...current, q: event.target.value, page: 1 }))} /><button className="min-h-14 bg-[#f19a69] px-7 font-extrabold text-[#173f3c]">Search careers</button></form>
      </section>

      {status.error && <div role="alert" className="profile-alert profile-alert-error mt-6">{status.error}</div>}

      <Shelf title="Browse by direction" subtitle="Career categories"><div className="career-category-grid">{categories.categories.map((item) => <button key={item.key} type="button" onClick={() => setFilters((current) => ({ ...current, category: item.key, page: 1 }))} className={filters.category === item.key ? "career-category career-category-active" : "career-category"}><span>{item.label}</span><strong>{item.count}</strong></button>)}</div></Shelf>

      {recommendations.length > 0 && <Shelf title="Recommended from your profile" subtitle="Transparent matching"><div className="career-grid">{recommendations.slice(0, 6).map(({ career, fit }) => <CareerCard key={career.id} career={career} fit={fit} saved={savedById.has(career.id)} onSave={toggleSaved} />)}</div></Shelf>}

      {catalogue.items.length > 0 && filters.page === 1 && !filters.q && !filters.category && <Shelf title="Popular and featured paths" subtitle="From the curated library"><div className="career-grid">{catalogue.items.slice(0, 6).map((career) => <CareerCard key={career.id} career={career} saved={savedById.has(career.id)} onSave={toggleSaved} />)}</div></Shelf>}

      <Shelf title="Ask the Career Explorer" subtitle="Career insights">
        <div className="career-ai-panel"><form onSubmit={askAi} className="grid gap-3 md:grid-cols-[1fr_auto]"><textarea className="field-input min-h-24" disabled={!ai.available} aria-label="Career insights question" placeholder={ai.available ? "Which careers combine mathematics and research?" : "Career insights are currently unavailable. The catalogue and recommendations remain available."} value={ai.question} onChange={(event) => setAi((current) => ({ ...current, question: event.target.value }))} /><button className="primary-button self-end" disabled={!ai.available || ai.loading}>{ai.loading ? "Exploring…" : ai.available ? "Generate career insights" : "Currently unavailable"}</button></form>{ai.error && <div role="alert" className="profile-alert profile-alert-error mt-4">Unable to complete this request. Please try again.</div>}{ai.result && <div className="career-ai-answer"><p>{ai.result.answerSummary}</p>{ai.result.suggestedCareers.length > 0 && <ul>{ai.result.suggestedCareers.map((item) => { const career = [...recommendations.map((entry) => entry.career), ...catalogue.items].find((entry) => entry.id === item.careerId); return <li key={item.careerId}><strong>{career?.title || "Catalogue career"}</strong> — {item.reasons[0]}</li>; })}</ul>}{ai.result.uncertainties.length > 0 && <small>Information to investigate: {ai.result.uncertainties.join(" ")}</small>}</div>}</div>
      </Shelf>

      <Shelf title="Explore the full library" subtitle={`${catalogue.pagination.total || 0} curated paths`}>
        <label className="mb-3 block max-w-sm text-xs font-extrabold uppercase tracking-[.12em] text-[#657b76]">Relevant skill<select aria-label="Relevant skill" className="field-input mt-2" value={filters.skillId} onChange={(event) => setFilters((current) => ({ ...current, skillId: event.target.value, page: 1 }))}><option value="">Any library skill</option>{skillOptions.map((skill) => <option key={skill.id} value={skill.id}>{skill.name}</option>)}</select></label>
        <div className="career-filter-bar"><select className="field-input" aria-label="Industry" value={filters.industry} onChange={(event) => setFilters((current) => ({ ...current, industry: event.target.value, page: 1 }))}><option value="">All industries</option>{categories.industries.map((value) => <option key={value}>{value}</option>)}</select><input className="field-input" placeholder="Academic discipline" value={filters.discipline} onChange={(event) => setFilters((current) => ({ ...current, discipline: event.target.value, page: 1 }))} /><input className="field-input" placeholder="Education pathway" value={filters.education} onChange={(event) => setFilters((current) => ({ ...current, education: event.target.value, page: 1 }))} /><select className="field-input" value={filters.workMode} onChange={(event) => setFilters((current) => ({ ...current, workMode: event.target.value, page: 1 }))}><option value="">Any work mode</option><option value="remote">Remote</option><option value="hybrid">Hybrid</option><option value="on_site">On site</option></select><select className="field-input" value={filters.employmentType} onChange={(event) => setFilters((current) => ({ ...current, employmentType: event.target.value, page: 1 }))}><option value="">Any employment type</option>{["full_time", "part_time", "contract", "freelance", "self_employed", "internship", "public_service"].map((item) => <option key={item} value={item}>{item.replaceAll("_", " ")}</option>)}</select><select className="field-input" value={filters.sort} onChange={(event) => setFilters((current) => ({ ...current, sort: event.target.value, page: 1 }))}><option value="featured">Featured</option><option value="popular">Popular</option><option value="title_asc">Title A–Z</option><option value="newest">Newest</option></select><button type="button" className="secondary-button" onClick={() => setFilters(initialFilters)}>Clear filters</button></div>
        {status.loading ? <div className="profile-loading mt-6">Opening the Career Library…</div> : catalogue.items.length ? <div className="career-grid mt-6">{catalogue.items.map((career) => <CareerCard key={career.id} career={career} saved={savedById.has(career.id)} onSave={toggleSaved} />)}</div> : <div className="career-empty">No careers matched these filters. Clear a filter or try a broader phrase.</div>}
        {catalogue.pagination.totalPages > 1 && <div className="mt-7 flex items-center justify-center gap-4"><button className="secondary-button" disabled={filters.page <= 1} onClick={() => setFilters((current) => ({ ...current, page: current.page - 1 }))}>Previous</button><span className="text-sm font-bold">Page {filters.page} of {catalogue.pagination.totalPages}</span><button className="secondary-button" disabled={filters.page >= catalogue.pagination.totalPages} onClick={() => setFilters((current) => ({ ...current, page: current.page + 1 }))}>Next</button></div>}
      </Shelf>

      {saved.length > 0 && <Shelf title="Saved for another look" subtitle="Decision workspace foundation"><div className="career-grid">{saved.map((item) => <CareerCard key={item.career.id} career={item.career} compact saved selectedForComparison={item.selectedForComparison} onSave={toggleSaved} onCompare={toggleCompare} />)}</div></Shelf>}
      {recent.length > 0 && <Shelf title="Continue exploring" subtitle="Recently viewed"><div className="career-grid">{recent.map((item) => <CareerCard key={item.career.id} career={item.career} compact saved={savedById.has(item.career.id)} onSave={toggleSaved} />)}</div></Shelf>}
    </AppShell>
  );
}

export default CareerExplorerPage;
