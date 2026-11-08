function LearningProgressPanel({ progress }) {
  const summary = progress?.summary || {};
  return <section className="learning-progress-panel">
    <div className="learning-section-heading"><div><p className="eyebrow">Learning progress</p><h2>Counts from your real saved records—nothing inferred.</h2><p>{progress?.methodology}</p></div></div>
    <div className="learning-stat-grid">{[["Total saved", summary.totalSaved], ["In learning list", summary.inLearningLibrary], ["In progress", summary.inProgress], ["Completed", summary.completed]].map(([label, value]) => <article key={label}><strong>{value || 0}</strong><span>{label}</span></article>)}</div>
    <div className="learning-progress-grid"><section><h3>Progress by skill</h3>{progress?.bySkill?.length ? <div className="learning-skill-progress-list">{progress.bySkill.map((item) => <article key={item.skill.id}><div><strong>{item.skill.name}</strong><small>{item.resources} saved resource{item.resources === 1 ? "" : "s"}</small></div><span><b>{item.inProgress}</b> active</span><span><b>{item.completed}</b> completed</span></article>)}</div> : <p className="learning-inline-empty">Add resources to My Learning to see skill-based activity.</p>}</section><section><h3>Recently updated</h3>{progress?.recentActivities?.length ? <div className="learning-activity-list">{progress.recentActivities.map((item) => <article key={item.id}><span className={`learning-status-dot learning-status-${item.status}`} /><div><strong>{item.resource.title}</strong><small>{item.status.replaceAll("_", " ")} · {new Date(item.updatedAt).toLocaleDateString()}</small></div></article>)}</div> : <p className="learning-inline-empty">No recent learning activity.</p>}</section></div>
  </section>;
}

export default LearningProgressPanel;
