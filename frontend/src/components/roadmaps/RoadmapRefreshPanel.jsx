function ChangeList({ title, items, empty }) {
  return <section><h4>{title} <span>{items.length}</span></h4>{items.length ? <ul>{items.map((item) => <li key={item.stableKey}><strong>{item.title}</strong><small>{item.stageKey.replaceAll("_", " ")} · {item.estimatedHours}h</small></li>)}</ul> : <p>{empty}</p>}</section>;
}

function RoadmapRefreshPanel({ proposal, loading, onGenerate, onConfirm }) {
  return <section className="roadmap-refresh"><div><p className="eyebrow">Profile-aware refresh</p><h2>Review every proposed change before applying it.</h2><p>Completed work is protected. A refresh never silently rewrites your roadmap.</p></div>
    {!proposal ? <button type="button" className="secondary-button" disabled={loading} onClick={onGenerate}>{loading ? "Comparing records…" : "Generate refresh proposal"}</button> : <><div className="roadmap-refresh-grid"><ChangeList title="Add" items={proposal.additions || []} empty="No additions" /><ChangeList title="Remove" items={proposal.removals || []} empty="No removals" /><ChangeList title="Change" items={proposal.changes || []} empty="No changes" /></div><div className="roadmap-refresh-summary"><span>{proposal.unchangedCount} unchanged</span><span>{proposal.completedTasksProtected} completed task{proposal.completedTasksProtected === 1 ? "" : "s"} protected</span><button type="button" className="primary-button" disabled={loading} onClick={onConfirm}>{loading ? "Applying…" : "Confirm refresh"}</button></div></>}
  </section>;
}

export default RoadmapRefreshPanel;
