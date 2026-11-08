import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import ApplicationTrackerPanel from "../components/opportunities/ApplicationTrackerPanel.jsx";
import OpportunityCard from "../components/opportunities/OpportunityCard.jsx";
import ModuleIntroduction from "../components/ui/ModuleIntroduction.jsx";
import AppShell from "../layouts/AppShell.jsx";
import { getCareerCategories } from "../services/careerApi.js";
import {
  getApplications, getOpportunities, getOpportunityFilters, getOpportunityRecommendations,
  removeApplication, saveOpportunity, updateApplication,
} from "../services/opportunityApi.js";
import { getSkillLibrary } from "../services/skillApi.js";

const initialFilters = { q: "", opportunityType: "", careerCategory: "", location: "", workMode: "", skillId: "", deadline: "open", sort: "deadline", page: 1, limit: 9 };
const views = [["explore", "Opportunity explorer"], ["recommended", "Recommended"], ["tracker", "Application tracker"]];

function OpportunitiesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const view = views.some(([key]) => key === searchParams.get("view")) ? searchParams.get("view") : "explore";
  const [filters, setFilters] = useState(initialFilters);
  const [catalogue, setCatalogue] = useState({ items: [], pagination: {} });
  const [options, setOptions] = useState({ opportunityTypes: [], locations: [], careerCategories: [], skills: [] });
  const [recommendations, setRecommendations] = useState({ items: [], methodology: "" });
  const [applications, setApplications] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [status, setStatus] = useState({ loading: true, busyId: "", error: "", message: "" });

  const loadSupporting = useCallback(async () => {
    try {
      const [filterData, categoryData, skillData, recommendationData, applicationData] = await Promise.all([
        getOpportunityFilters(), getCareerCategories(), getSkillLibrary({ status: "active", limit: 50 }),
        getOpportunityRecommendations(), getApplications({ scope: "tracked", limit: 50 }),
      ]);
      setOptions({ opportunityTypes: filterData.opportunityTypes || [], locations: filterData.locations || [], careerCategories: categoryData.categories || [], skills: skillData.items || [] });
      setRecommendations(recommendationData); setApplications(applicationData.items || []);
    } catch (error) { setStatus((value) => ({ ...value, error: error.message })); }
  }, []);

  useEffect(() => { loadSupporting(); }, [loadSupporting, refreshKey]);
  useEffect(() => {
    let current = true;
    setStatus((value) => ({ ...value, loading: true, error: "" }));
    const timer = window.setTimeout(() => getOpportunities(filters).then((data) => current && setCatalogue(data))
      .catch((error) => current && setStatus((value) => ({ ...value, error: error.message })))
      .finally(() => current && setStatus((value) => ({ ...value, loading: false }))), filters.q ? 250 : 0);
    return () => { current = false; window.clearTimeout(timer); };
  }, [filters, refreshKey]);

  async function save(opportunityId, action) {
    setStatus((value) => ({ ...value, busyId: opportunityId, error: "", message: "" }));
    try { const response = await saveOpportunity(opportunityId, action); setStatus((value) => ({ ...value, busyId: "", message: response.message })); setRefreshKey((value) => value + 1); }
    catch (error) { setStatus((value) => ({ ...value, busyId: "", error: error.message })); }
  }
  async function update(applicationId, values) {
    setStatus((value) => ({ ...value, busyId: applicationId, error: "" }));
    try { await updateApplication(applicationId, values); setRefreshKey((value) => value + 1); }
    catch (error) { setStatus((value) => ({ ...value, error: error.message })); }
    finally { setStatus((value) => ({ ...value, busyId: "" })); }
  }
  async function remove(applicationId) {
    if (!window.confirm("Remove this saved opportunity and its tracker notes?")) return;
    try { await removeApplication(applicationId); setRefreshKey((value) => value + 1); }
    catch (error) { setStatus((value) => ({ ...value, error: error.message })); }
  }

  return <AppShell eyebrow="Opportunity and eligibility intelligence" title="Discover opportunities">
    <ModuleIntroduction eyebrow="Move from preparation to action" title="Opportunities" description="Explore relevant internships, jobs, scholarships and other opportunities, then understand the requirements before deciding what to pursue." value="Open an opportunity to review eligibility evidence, distinguish missing information from unmet requirements, and maintain your own application status and notes." capabilities={["Search and filter active opportunities", "Review explainable eligibility requirements", "Track applications and update their status"]} action={{ onClick: () => setSearchParams({}), label: "Search opportunities" }} />
    <section className="opportunity-hero"><div><p>Evidence before applications</p><h2>Find opportunities, understand the requirements, then decide what to pursue.</h2><span>Official-source catalogue · explainable eligibility · student-controlled application tracking</span></div><div><strong>{catalogue.pagination.total || 0}</strong><small>matching opportunities</small></div></section>
    {status.error && <div role="alert" className="profile-alert profile-alert-error mt-6">{status.error}</div>}{status.message && <div role="status" className="profile-alert profile-alert-success mt-6">{status.message}</div>}
    <nav className="opportunity-tabs" aria-label="Opportunity workspace sections">{views.map(([key, label]) => <button key={key} type="button" className={view === key ? "opportunity-tab-active" : ""} onClick={() => setSearchParams(key === "explore" ? {} : { view: key })}>{label}{key === "tracker" && applications.length ? ` (${applications.length})` : ""}</button>)}</nav>

    {view === "explore" && <><section className="opportunity-filter"><div><label>Search<input className="field-input" placeholder="Organization, title, location or keyword" value={filters.q} onChange={(event) => setFilters((value) => ({ ...value, q: event.target.value, page: 1 }))} /></label><label>Opportunity type<select className="field-input" value={filters.opportunityType} onChange={(event) => setFilters((value) => ({ ...value, opportunityType: event.target.value, page: 1 }))}><option value="">All types</option>{options.opportunityTypes.map((item) => <option key={item.key} value={item.key}>{item.label} ({item.count})</option>)}</select></label><label>Career category<select className="field-input" value={filters.careerCategory} onChange={(event) => setFilters((value) => ({ ...value, careerCategory: event.target.value, page: 1 }))}><option value="">All career areas</option>{options.careerCategories.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}</select></label><label>Location<select className="field-input" value={filters.location} onChange={(event) => setFilters((value) => ({ ...value, location: event.target.value, page: 1 }))}><option value="">Any location</option>{options.locations.map((item) => <option key={item}>{item}</option>)}</select></label><label>Work mode<select className="field-input" value={filters.workMode} onChange={(event) => setFilters((value) => ({ ...value, workMode: event.target.value, page: 1 }))}><option value="">Any work mode</option><option value="on_site">On site</option><option value="hybrid">Hybrid</option><option value="remote">Remote</option><option value="unknown">Not specified</option></select></label><label>Required skill<select className="field-input" value={filters.skillId} onChange={(event) => setFilters((value) => ({ ...value, skillId: event.target.value, page: 1 }))}><option value="">Any skill</option>{options.skills.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>Deadline<select className="field-input" value={filters.deadline} onChange={(event) => setFilters((value) => ({ ...value, deadline: event.target.value, page: 1 }))}><option value="open">Open or no fixed deadline</option><option value="upcoming_7">Next 7 days</option><option value="upcoming_30">Next 30 days</option><option value="upcoming_90">Next 90 days</option><option value="no_deadline">No fixed deadline</option><option value="expired">Expired</option><option value="all">All deadlines</option></select></label><label>Sort<select className="field-input" value={filters.sort} onChange={(event) => setFilters((value) => ({ ...value, sort: event.target.value, page: 1 }))}><option value="deadline">Deadline</option><option value="newest">Newest</option><option value="title_asc">Title A–Z</option></select></label></div><button type="button" className="secondary-button" onClick={() => setFilters(initialFilters)}>Clear filters</button></section>
      {status.loading ? <div className="profile-loading mt-6">Searching the Opportunity Library…</div> : catalogue.items.length ? <div className="opportunity-grid">{catalogue.items.map((item) => <OpportunityCard key={item.id} opportunity={item} busy={status.busyId === item.id} onSave={(id) => save(id, "save")} onTrack={(id) => save(id, "track")} />)}</div> : <div className="opportunity-empty"><h3>No opportunities match these filters.</h3><p>Clear a filter or broaden the search phrase.</p></div>}
      {catalogue.pagination.totalPages > 1 && <div className="opportunity-pagination"><button className="secondary-button" disabled={filters.page <= 1} onClick={() => setFilters((value) => ({ ...value, page: value.page - 1 }))}>Previous</button><span>Page {filters.page} of {catalogue.pagination.totalPages}</span><button className="secondary-button" disabled={filters.page >= catalogue.pagination.totalPages} onClick={() => setFilters((value) => ({ ...value, page: value.page + 1 }))}>Next</button></div>}</>}
    {view === "recommended" && <section className="opportunity-recommended"><div className="opportunity-section-heading"><div><p className="eyebrow">Personalized recommendations</p><h2>Prioritized from recorded evidence.</h2><p>{recommendations.methodology}</p></div></div>{recommendations.items?.length ? <div className="opportunity-grid">{recommendations.items.map((item) => <OpportunityCard key={item.opportunity.id} opportunity={item.opportunity} eligibility={item.eligibility} reasons={item.reasons} busy={status.busyId === item.opportunity.id} onSave={(id) => save(id, "save")} onTrack={(id) => save(id, "track")} />)}</div> : <div className="opportunity-empty"><h3>No active recommendation yet.</h3><p>Add more profile, skill and saved-career details, or return when new opportunities are available.</p></div>}</section>}
    {view === "tracker" && <ApplicationTrackerPanel applications={applications} busyId={status.busyId} onUpdate={update} onRemove={remove} />}
  </AppShell>;
}

export default OpportunitiesPage;
