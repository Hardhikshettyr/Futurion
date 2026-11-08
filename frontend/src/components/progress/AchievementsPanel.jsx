import { Link } from "react-router-dom";

function AchievementsPanel({ achievements, compact = false }) {
  return <section className={`achievement-panel ${compact ? "achievement-panel-compact" : ""}`}><header><p className="eyebrow">Documented milestones</p><h2>Achievements grounded in actual records.</h2><p>No points or random awards—each milestone links back to completed work.</p></header>
    {achievements.length ? <div>{achievements.map((item, index) => <article key={item.key}><b>{String(index + 1).padStart(2, "0")}</b><div><span>{item.module} · {new Date(item.date).toLocaleDateString()}</span><h3>{item.title}</h3><p>{item.description}</p>{item.href && <Link to={item.href}>Review record</Link>}</div></article>)}</div> : <div className="progress-empty"><h3>Your first milestone is ahead.</h3><p>Document a project, add skill evidence, complete learning, or track an opportunity.</p></div>}
  </section>;
}

export default AchievementsPanel;
