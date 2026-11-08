import { Link } from "react-router-dom";

const typeLabel = (value) => value.replaceAll("_", " ");

function Price({ resource }) {
  if (resource.priceType === "free") return "Free";
  if (resource.priceAmount !== null) return `${resource.currency} ${resource.priceAmount}`;
  return resource.priceType === "paid" ? "Paid · price varies" : "Price not recorded";
}

function LearningResourceCard({ resource, recommendation = null, onSave, compareSelected = false, onToggleCompare }) {
  const state = resource.studentState || {};
  return <article className="learning-resource-card">
    <div className="learning-card-topline"><span>{typeLabel(resource.resourceType)}</span><b>{resource.difficulty}</b></div>
    <div><p className="learning-provider">{resource.provider}</p><h3>{resource.title}</h3><p className="learning-card-description">{resource.description}</p></div>
    <div className="learning-skill-chips">{resource.skillsCovered.slice(0, 4).map((skill) => <span key={skill.id}>{skill.name}</span>)}</div>
    <div className="learning-card-facts"><span><small>Access</small><strong><Price resource={resource} /></strong></span><span><small>Duration</small><strong>{resource.duration || "Not specified"}</strong></span><span><small>Certificate</small><strong>{resource.certificateAvailable ? "Available" : "Not listed"}</strong></span></div>
    {recommendation && <div className="learning-reason"><strong>{recommendation.priorityType === "prerequisite_first" ? "Foundation first" : "Goal alignment"}</strong><p>{recommendation.reasons[0]}</p>{recommendation.relatedCareers.length > 0 && <small>Connected to {recommendation.relatedCareers.join(" · ")}</small>}</div>}
    <div className="learning-card-actions">
      <Link to={`/dashboard/learning/${resource.id}`}>View details</Link>
      <button type="button" onClick={() => onSave?.(resource.id, "bookmark")} className={state.bookmarked ? "learning-action-active" : ""}>{state.bookmarked ? "Bookmarked ✓" : "Bookmark"}</button>
      <button type="button" onClick={() => onSave?.(resource.id, "add_to_library")} className={state.inLearningLibrary ? "learning-action-active" : ""}>{state.inLearningLibrary ? "In My Learning ✓" : "Add to My Learning"}</button>
    </div>
    {onToggleCompare && <label className="learning-compare-toggle"><input type="checkbox" checked={compareSelected} onChange={() => onToggleCompare(resource.id)} /> Select for learning guidance</label>}
  </article>;
}

export default LearningResourceCard;
