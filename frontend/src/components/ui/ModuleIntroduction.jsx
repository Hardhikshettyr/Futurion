import { Link } from "react-router-dom";

function IntroductionAction({ action }) {
  if (!action) return null;
  if (action.to) return <Link className="module-introduction-action" to={action.to}>{action.label}<span aria-hidden="true">→</span></Link>;
  if (action.href) return <a className="module-introduction-action" href={action.href}>{action.label}<span aria-hidden="true">↓</span></a>;
  return <button type="button" className="module-introduction-action" onClick={action.onClick}>{action.label}<span aria-hidden="true">→</span></button>;
}

function ModuleIntroduction({ eyebrow, title, description, value, capabilities = [], action }) {
  const headingId = `module-introduction-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  return (
    <section className="module-introduction" aria-labelledby={headingId}>
      <div className="module-introduction-copy">
        <p className="eyebrow">{eyebrow}</p>
        <h2 id={headingId}>{title}</h2>
        <p>{description}</p>
        <strong>{value}</strong>
        <IntroductionAction action={action} />
      </div>
      <div className="module-introduction-capabilities" aria-label={`What you can do in ${title}`}>
        <span>Inside this workspace</span>
        <ul>{capabilities.map((item, index) => <li key={item}><b>{String(index + 1).padStart(2, "0")}</b><span>{item}</span></li>)}</ul>
      </div>
    </section>
  );
}

export default ModuleIntroduction;
