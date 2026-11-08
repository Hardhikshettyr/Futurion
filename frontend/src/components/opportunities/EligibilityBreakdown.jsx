const statusHelp = { met: "Recorded evidence matches", partially_met: "Some conditions match", not_met: "Recorded information does not meet this requirement", unknown: "Information not provided" };

function EligibilityBreakdown({ eligibility }) {
  if (!eligibility) return null;
  return <section className="eligibility-panel"><header><div><p className="eyebrow">Eligibility review</p><h2>{eligibility.overallLabel}</h2><p>{eligibility.disclaimer}</p></div><div className={`eligibility-score eligibility-${eligibility.overall}`}><strong>{eligibility.summary.mandatoryCoverage ?? "—"}{eligibility.summary.mandatoryCoverage !== null ? "%" : ""}</strong><span>recorded requirements met</span></div></header>
    <div className="eligibility-summary">{[["Meets requirements", eligibility.summary.met], ["Partially meets", eligibility.summary.partiallyMet], ["Does not meet", eligibility.summary.notMet], ["Information not provided", eligibility.summary.unknown]].map(([label, value]) => <span key={label}><b>{value}</b>{label}</span>)}</div>
    <div className="eligibility-list">{eligibility.requirements.map((item) => <article key={item.key} className={`eligibility-item eligibility-item-${item.status}`}><div><span>{item.category.replaceAll("_", " ")} · {item.importance}</span><h3>{item.title}</h3><small>{item.requirement}</small></div><b>{item.statusLabel}</b><p>{item.explanation}</p>{item.evidence.length > 0 && <ul>{item.evidence.map((value) => <li key={value}>{value}</li>)}</ul>}<em>{statusHelp[item.status]}</em></article>)}</div>
  </section>;
}

export default EligibilityBreakdown;
