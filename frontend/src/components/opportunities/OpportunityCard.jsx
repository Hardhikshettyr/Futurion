import { Link } from "react-router-dom";

function deadlineText(opportunity) {
  if (!opportunity.applicationDeadline) return "Deadline varies";
  if (opportunity.expired) return `Expired ${new Date(opportunity.applicationDeadline).toLocaleDateString()}`;
  return `${opportunity.daysRemaining} day${opportunity.daysRemaining === 1 ? "" : "s"} left`;
}

function OpportunityCard({ opportunity, eligibility, reasons = [], onSave, onTrack, busy = false }) {
  const state = opportunity.studentState || {};
  return <article className={`opportunity-card ${opportunity.expired ? "opportunity-card-expired" : ""}`}>
    <header><span>{opportunity.opportunityTypeLabel}</span>{eligibility && <b className={`eligibility-badge eligibility-${eligibility.overall}`}>{eligibility.overallLabel}</b>}</header>
    <h3>{opportunity.title}</h3><p className="opportunity-org">{opportunity.organization}</p>
    <div className="opportunity-meta"><span>{opportunity.location}</span><span>{opportunity.workMode.replaceAll("_", " ")}</span><span className={opportunity.expired ? "opportunity-deadline-expired" : ""}>{deadlineText(opportunity)}</span></div>
    <p className="opportunity-description">{opportunity.description}</p>
    {opportunity.requiredSkills.length > 0 && <div className="opportunity-skills">{opportunity.requiredSkills.slice(0, 4).map((item) => <span key={item.skill.id}>{item.skill.name} · {item.minimumProficiency}</span>)}</div>}
    {reasons[0] && <p className="opportunity-reason">{reasons[0]}</p>}
    <footer><Link to={`/dashboard/opportunities/${opportunity.id}`}>View details</Link>{onSave && <button type="button" disabled={busy} onClick={() => onSave(opportunity.id)}>{state.saved ? "Saved ✓" : "Save"}</button>}{onTrack && !opportunity.expired && <button type="button" disabled={busy} onClick={() => onTrack(opportunity.id)}>{state.inTracker ? "Tracking ✓" : "Track application"}</button>}</footer>
  </article>;
}

export default OpportunityCard;
