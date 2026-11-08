import { Link } from "react-router-dom";

function ActivityTimeline({ items }) {
  return <section className="career-activity"><header><div><p className="eyebrow">Career activity timeline</p><h2>Documented movement across Futurion.</h2></div><span>{items.length} events</span></header>
    {items.length ? <div className="career-activity-list">{items.map((item) => <article key={item.id}><time dateTime={item.date}>{new Date(item.date).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" })}</time><div><span>{item.module}</span><h3>{item.title}</h3><p>{item.description}</p>{item.href && <Link to={item.href}>Open source record →</Link>}</div></article>)}</div> : <div className="progress-empty"><h3>No dated activity yet.</h3><p>Add profile, skill, learning, roadmap or opportunity records to build the timeline.</p></div>}
  </section>;
}

export default ActivityTimeline;
