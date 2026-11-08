import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import EligibilityBreakdown from "../components/opportunities/EligibilityBreakdown.jsx";
import OpportunityAiPanel from "../components/opportunities/OpportunityAiPanel.jsx";
import AppShell from "../layouts/AppShell.jsx";
import { getOpportunity, getOpportunityAiStatus, getOpportunityEligibility, saveOpportunity } from "../services/opportunityApi.js";

function RequirementList({ title, items, render }) {
  return <section className="opportunity-requirement-section"><h2>{title}</h2>{items.length ? <div>{items.map((item, index) => <article key={item._id || item.skill?.id || `${title}-${index}`}>{render(item)}</article>)}</div> : <p>Information not provided for this section.</p>}</section>;
}

function OpportunityDetailPage() {
  const { opportunityId } = useParams();
  const [opportunity, setOpportunity] = useState(null);
  const [eligibility, setEligibility] = useState(null);
  const [aiAvailable, setAiAvailable] = useState(false);
  const [status, setStatus] = useState({ loading: true, busy: false, error: "", message: "" });

  const load = useCallback(async () => {
    setStatus((value) => ({ ...value, loading: true, error: "" }));
    try {
      const [detail, eligibilityData, ai] = await Promise.all([getOpportunity(opportunityId), getOpportunityEligibility(opportunityId), getOpportunityAiStatus()]);
      setOpportunity(detail.opportunity); setEligibility(eligibilityData.eligibility); setAiAvailable(ai.available);
    } catch (error) { setStatus((value) => ({ ...value, error: error.message })); }
    finally { setStatus((value) => ({ ...value, loading: false })); }
  }, [opportunityId]);
  useEffect(() => { load(); }, [load]);

  async function save(action) {
    setStatus((value) => ({ ...value, busy: true, error: "", message: "" }));
    try { const response = await saveOpportunity(opportunityId, action); setStatus((value) => ({ ...value, busy: false, message: response.message })); await load(); }
    catch (error) { setStatus((value) => ({ ...value, busy: false, error: error.message })); }
  }

  return <AppShell eyebrow="Opportunity intelligence" title={opportunity?.title || "Opportunity details"}>
    <Link className="opportunity-back" to="/dashboard/opportunities">← Opportunity explorer</Link>
    {status.error && <div role="alert" className="profile-alert profile-alert-error mt-5">{status.error}</div>}{status.message && <div role="status" className="profile-alert profile-alert-success mt-5">{status.message}</div>}
    {status.loading ? <div className="profile-loading mt-6">Loading opportunity and eligibility…</div> : opportunity && <>
      <section className={`opportunity-detail-hero ${opportunity.expired ? "opportunity-detail-expired" : ""}`}><div><span>{opportunity.opportunityTypeLabel}</span><p>{opportunity.organization}</p><h2>{opportunity.title}</h2><div><b>{opportunity.location}</b><b>{opportunity.workMode.replaceAll("_", " ")}</b><b>{opportunity.applicationDeadline ? `${opportunity.expired ? "Expired" : "Deadline"} ${new Date(opportunity.applicationDeadline).toLocaleDateString()}` : "Deadline varies by opening"}</b></div></div><aside><button type="button" className="secondary-button" disabled={status.busy} onClick={() => save("save")}>{opportunity.studentState.saved ? "Saved ✓" : "Save opportunity"}</button>{!opportunity.expired && <button type="button" className="primary-button" disabled={status.busy} onClick={() => save("track")}>{opportunity.studentState.inTracker ? "In application tracker ✓" : "Add to tracker"}</button>}{opportunity.externalApplicationUrl ? <a className="opportunity-external" href={opportunity.externalApplicationUrl} target="_blank" rel="noreferrer">Open verified official source ↗</a> : <small>An official application link is not currently available. Verify the opportunity with the organization before applying.</small>}</aside></section>
      <div className="opportunity-detail-grid"><main><section className="opportunity-copy"><p className="eyebrow">About this opportunity</p><p>{opportunity.description}</p>{opportunity.compensation?.summary && <div><strong>Compensation</strong><span>{opportunity.compensation.summary}</span></div>}</section>
        <RequirementList title="Skill requirements" items={opportunity.requiredSkills} render={(item) => <><header><strong>{item.skill.name}</strong><span>{item.importance}</span></header><p>{item.minimumProficiency} · {item.evidenceRequired} evidence</p>{item.rationale && <small>{item.rationale}</small>}</>} />
        <RequirementList title="Education requirements" items={opportunity.requiredEducation} render={(item) => <><header><strong>{item.description}</strong><span>{item.importance}</span></header>{item.acceptedLevels.length > 0 && <p>Levels: {item.acceptedLevels.join(", ")}</p>}{item.acceptedDisciplines.length > 0 && <small>Disciplines: {item.acceptedDisciplines.join(", ")}</small>}</>} />
        <RequirementList title="Qualifications" items={opportunity.requiredQualifications} render={(item) => <><header><strong>{item.name}</strong><span>{item.importance}</span></header><p>{item.description || item.issuer || "Named qualification"}</p></>} />
        <RequirementList title="Experience requirements" items={opportunity.experienceRequirements} render={(item) => <><header><strong>{item.description}</strong><span>{item.importance}</span></header><p>{item.minimumMonths} minimum month{item.minimumMonths === 1 ? "" : "s"}{item.acceptedTypes.length ? ` · ${item.acceptedTypes.join(", ")}` : ""}</p></>} />
        {opportunity.otherConditions.length > 0 && <RequirementList title="Other eligibility conditions" items={opportunity.otherConditions} render={(item) => <><header><strong>{item.label}</strong><span>{item.importance}</span></header><p>{item.description}</p></>} />}
      </main><aside className="opportunity-side"><EligibilityBreakdown eligibility={eligibility} /></aside></div>
      <OpportunityAiPanel opportunityId={opportunity.id} eligibility={eligibility} available={aiAvailable} />
    </>}
  </AppShell>;
}

export default OpportunityDetailPage;
