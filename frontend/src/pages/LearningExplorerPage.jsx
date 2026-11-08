import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import LearningAiPanel from "../components/learning/LearningAiPanel.jsx";
import LearningLibraryPanel from "../components/learning/LearningLibraryPanel.jsx";
import LearningProgressPanel from "../components/learning/LearningProgressPanel.jsx";
import LearningResourceCard from "../components/learning/LearningResourceCard.jsx";
import ModuleIntroduction from "../components/ui/ModuleIntroduction.jsx";
import AppShell from "../layouts/AppShell.jsx";
import {
  getLearningAiStatus, getLearningFilters, getLearningProgress,
  getLearningRecommendations, getLearningResources, getMyLearning,
  removeLearningItem, saveLearningResource, updateLearningItem,
} from "../services/learningApi.js";
import { getSkillLibrary } from "../services/skillApi.js";

const initialFilters = { q: "", resourceType: "", skillId: "", difficulty: "", priceType: "", provider: "", categoryId: "", sort: "relevance", page: 1, limit: 9 };
const views = [["explore", "Resource explorer"], ["recommended", "Recommended"], ["library", "My Learning"], ["progress", "Progress"], ["assistant", "Learning guidance"]];

function LearningExplorerPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const view = views.some(([key]) => key === searchParams.get("view")) ? searchParams.get("view") : "explore";
  const [filters, setFilters] = useState(initialFilters);
  const [catalogue, setCatalogue] = useState({ items: [], pagination: { page: 1, totalPages: 1, total: 0 } });
  const [options, setOptions] = useState({ providers: [], categories: [], skills: [] });
  const [recommendations, setRecommendations] = useState({ items: [], explanation: "" });
  const [library, setLibrary] = useState({ items: [], pagination: {} });
  const [libraryScope, setLibraryScope] = useState("all");
  const [progress, setProgress] = useState(null);
  const [aiAvailable, setAiAvailable] = useState(false);
  const [selectedAiIds, setSelectedAiIds] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [status, setStatus] = useState({ loading: true, catalogueLoading: true, error: "", message: "" });

  const loadSupportingData = useCallback(async () => {
    setStatus((value) => ({ ...value, loading: true, error: "" }));
    try {
      const [filterData, skillData, recommendationData, progressData, aiStatus] = await Promise.all([
        getLearningFilters(), getSkillLibrary({ status: "active", limit: 50 }), getLearningRecommendations(), getLearningProgress(), getLearningAiStatus(),
      ]);
      setOptions({ providers: filterData.providers || [], categories: filterData.categories || [], skills: skillData.items || [] });
      setRecommendations(recommendationData);
      setProgress(progressData.progress);
      setAiAvailable(aiStatus.available);
    } catch (error) { setStatus((value) => ({ ...value, error: error.message })); }
    finally { setStatus((value) => ({ ...value, loading: false })); }
  }, []);

  const loadLibrary = useCallback(async () => {
    try { setLibrary(await getMyLearning({ scope: libraryScope, limit: 50 })); }
    catch (error) { setStatus((value) => ({ ...value, error: error.message })); }
  }, [libraryScope]);

  useEffect(() => { loadSupportingData(); }, [loadSupportingData, refreshKey]);
  useEffect(() => { loadLibrary(); }, [loadLibrary, refreshKey]);
  useEffect(() => {
    let current = true;
    setStatus((value) => ({ ...value, catalogueLoading: true, error: "" }));
    const timer = window.setTimeout(() => {
      getLearningResources(filters).then((response) => current && setCatalogue(response))
        .catch((error) => current && setStatus((value) => ({ ...value, error: error.message })))
        .finally(() => current && setStatus((value) => ({ ...value, catalogueLoading: false })));
    }, filters.q ? 300 : 0);
    return () => { current = false; window.clearTimeout(timer); };
  }, [filters, refreshKey]);

  async function save(resourceId, action) {
    setStatus((value) => ({ ...value, error: "", message: "" }));
    try {
      const response = await saveLearningResource(resourceId, action);
      setStatus((value) => ({ ...value, message: response.message }));
      setRefreshKey((value) => value + 1);
    } catch (error) { setStatus((value) => ({ ...value, error: error.message })); }
  }

  async function updateItem(itemId, values) {
    try { await updateLearningItem(itemId, values); setRefreshKey((value) => value + 1); }
    catch (error) { setStatus((value) => ({ ...value, error: error.message })); }
  }

  async function removeItem(itemId) {
    if (!window.confirm("Remove this resource and its learning status?")) return;
    try { await removeLearningItem(itemId); setRefreshKey((value) => value + 1); }
    catch (error) { setStatus((value) => ({ ...value, error: error.message })); }
  }

  function toggleAi(resourceId) {
    setSelectedAiIds((items) => items.includes(resourceId) ? items.filter((id) => id !== resourceId) : items.length < 4 ? [...items, resourceId] : items);
  }

  const resourceNames = useMemo(() => new Map([
    ...catalogue.items.map((item) => [item.id, item.title]),
    ...recommendations.items.map((item) => [item.resource.id, item.resource.title]),
    ...library.items.filter((item) => item.resource).map((item) => [item.resource.id, item.resource.title]),
  ]), [catalogue.items, recommendations.items, library.items]);
  const summary = progress?.summary || {};

  return <AppShell eyebrow="Education and learning intelligence" title="Learning resource library">
    <ModuleIntroduction eyebrow="Develop skills with purpose" title="Learning Resources" description="Discover educational resources that can help you build the skills and knowledge required for your career goals." value="Use filters to find a suitable course, certification, tutorial, book or documentation resource, then save it to your learning library and track progress." capabilities={["Search and filter recorded resources", "Understand skill and career relevance", "Save resources and track learning completion"]} action={{ onClick: () => setSearchParams({}), label: "Find a learning resource" }} />
    <section className="learning-hero"><div><p>Learn with a reason</p><h2>Find the next useful resource—not another endless list.</h2><span>Curated library · central Skill references · career-aware recommendations · real progress records</span></div><div className="learning-hero-stats"><span><strong>{catalogue.pagination.total || 0}</strong> matching resources</span><span><strong>{summary.inProgress || 0}</strong> in progress</span><span><strong>{summary.completed || 0}</strong> completed</span></div></section>
    {status.error && <div role="alert" className="profile-alert profile-alert-error mt-6">{status.error}</div>}
    {status.message && <div role="status" className="profile-alert profile-alert-success mt-6">{status.message}</div>}
    <nav className="learning-view-tabs" aria-label="Learning workspace sections">{views.map(([key, label]) => <button type="button" key={key} onClick={() => setSearchParams(key === "explore" ? {} : { view: key })} className={view === key ? "learning-view-active" : ""}>{label}{key === "assistant" && selectedAiIds.length > 0 ? ` (${selectedAiIds.length})` : ""}</button>)}</nav>

    {view === "explore" && <section className="learning-explorer"><div className="learning-section-heading"><div><p className="eyebrow">Curated resource catalogue</p><h2>Search by topic, skill, format, provider, difficulty, or cost.</h2></div><button type="button" className="secondary-button" onClick={() => setFilters(initialFilters)}>Clear filters</button></div><div className="learning-filter-grid"><input aria-label="Search learning resources" className="field-input learning-search" type="search" placeholder="Search titles, providers, or descriptions…" value={filters.q} onChange={(event) => setFilters((value) => ({ ...value, q: event.target.value, page: 1 }))} /><select aria-label="Resource type" className="field-input" value={filters.resourceType} onChange={(event) => setFilters((value) => ({ ...value, resourceType: event.target.value, page: 1 }))}><option value="">All resource types</option>{["course", "certification", "tutorial", "book", "documentation", "university_program", "practice_platform", "other"].map((item) => <option key={item} value={item}>{item.replaceAll("_", " ")}</option>)}</select><select aria-label="Covered skill" className="field-input" value={filters.skillId} onChange={(event) => setFilters((value) => ({ ...value, skillId: event.target.value, page: 1 }))}><option value="">All skills</option>{options.skills.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><select aria-label="Difficulty" className="field-input" value={filters.difficulty} onChange={(event) => setFilters((value) => ({ ...value, difficulty: event.target.value, page: 1 }))}><option value="">All difficulties</option>{["beginner", "intermediate", "advanced"].map((item) => <option key={item}>{item}</option>)}</select><select aria-label="Price type" className="field-input" value={filters.priceType} onChange={(event) => setFilters((value) => ({ ...value, priceType: event.target.value, page: 1 }))}><option value="">Any price type</option><option value="free">Free</option><option value="paid">Paid</option><option value="unknown">Information not provided</option></select><select aria-label="Provider" className="field-input" value={filters.provider} onChange={(event) => setFilters((value) => ({ ...value, provider: event.target.value, page: 1 }))}><option value="">All providers</option>{options.providers.map((item) => <option key={item}>{item}</option>)}</select><select aria-label="Resource category" className="field-input" value={filters.categoryId} onChange={(event) => setFilters((value) => ({ ...value, categoryId: event.target.value, page: 1 }))}><option value="">All categories</option>{options.categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><select aria-label="Sort resources" className="field-input" value={filters.sort} onChange={(event) => setFilters((value) => ({ ...value, sort: event.target.value, page: 1 }))}><option value="relevance">Recommended order</option><option value="title_asc">Title A–Z</option><option value="provider">Provider</option><option value="newest">Newest</option><option value="difficulty">Difficulty</option></select></div>{status.catalogueLoading ? <div className="profile-loading">Searching the resource library…</div> : catalogue.items.length ? <div className="learning-resource-grid">{catalogue.items.map((resource) => <LearningResourceCard key={resource.id} resource={resource} onSave={save} compareSelected={selectedAiIds.includes(resource.id)} onToggleCompare={toggleAi} />)}</div> : <div className="learning-empty"><span>NO MATCH</span><h3>No active resources match these filters.</h3><p>Try a broader phrase or remove one filter. Futurion will not fabricate a resource to fill this page.</p></div>}{catalogue.pagination.totalPages > 1 && <div className="learning-pagination"><button className="secondary-button" disabled={filters.page <= 1} onClick={() => setFilters((value) => ({ ...value, page: value.page - 1 }))}>Previous</button><span>Page {filters.page} of {catalogue.pagination.totalPages}</span><button className="secondary-button" disabled={filters.page >= catalogue.pagination.totalPages} onClick={() => setFilters((value) => ({ ...value, page: value.page + 1 }))}>Next</button></div>}</section>}

    {view === "recommended" && <section><div className="learning-section-heading"><div><p className="eyebrow">Personalized recommendations</p><h2>Resources tied to recorded gaps and goals.</h2><p>{recommendations.explanation}</p></div></div>{status.loading ? <div className="profile-loading">Mapping resources to your goals…</div> : recommendations.items.length ? <div className="learning-resource-grid">{recommendations.items.map((item) => <LearningResourceCard key={item.resource.id} resource={item.resource} recommendation={item} onSave={save} compareSelected={selectedAiIds.includes(item.resource.id)} onToggleCompare={toggleAi} />)}</div> : <div className="learning-empty"><span>NO DIRECT MATCH</span><h3>No relevant resource is currently in the catalogue.</h3><p>Refine your career or skill goals, or explore the full library. No unrelated filler has been added.</p></div>}</section>}
    {view === "library" && <LearningLibraryPanel items={library.items || []} scope={libraryScope} onScope={setLibraryScope} onUpdate={updateItem} onRemove={removeItem} loading={status.loading} />}
    {view === "progress" && <LearningProgressPanel progress={progress} />}
    {view === "assistant" && <LearningAiPanel available={aiAvailable} selectedIds={selectedAiIds} resourceNames={resourceNames} />}
  </AppShell>;
}

export default LearningExplorerPage;
