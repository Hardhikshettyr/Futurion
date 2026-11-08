import { Link } from "react-router-dom";

function LearningLibraryPanel({ items, scope, onScope, onUpdate, onRemove, loading }) {
  const scopes = [["all", "All saved"], ["bookmarked", "Bookmarks"], ["learning", "My Learning"], ["completed", "Completed"]];
  return <section className="learning-library-panel">
    <div className="learning-section-heading"><div><p className="eyebrow">My Learning Library</p><h2>Turn useful links into visible learning activity.</h2><p>Statuses describe resource progress only. Completion does not verify a skill.</p></div><div className="learning-scope-tabs">{scopes.map(([key, label]) => <button type="button" key={key} className={scope === key ? "learning-scope-active" : ""} onClick={() => onScope(key)}>{label}</button>)}</div></div>
    {loading ? <div className="profile-loading">Loading your learning records…</div> : items.length ? <div className="learning-library-list">{items.map((item) => <article key={item.id}>
      <div><small>{item.resource.resourceType.replaceAll("_", " ")} · {item.resource.provider}</small><h3><Link to={`/dashboard/learning/${item.resource.id}`}>{item.resource.title}</Link></h3><p>{item.resource.skillsCovered.map((skill) => skill.name).join(" · ")}</p></div>
      <div className="learning-library-state"><label>Status<select value={item.status} onChange={(event) => onUpdate(item.id, { status: event.target.value })}><option value="not_started">Not started</option><option value="in_progress">In progress</option><option value="completed">Completed</option></select></label><label><input type="checkbox" checked={item.bookmarked} onChange={(event) => onUpdate(item.id, { bookmarked: event.target.checked })} /> Bookmarked</label><label><input type="checkbox" checked={item.inLearningLibrary} onChange={(event) => onUpdate(item.id, { inLearningLibrary: event.target.checked })} /> In learning list</label><button type="button" onClick={() => onRemove(item.id)}>Remove</button></div>
    </article>)}</div> : <div className="learning-empty"><span>LIBRARY</span><h3>No resources in this view yet.</h3><p>Explore the catalogue or recommendations and save only the resources that support an actual goal.</p></div>}
  </section>;
}

export default LearningLibraryPanel;
