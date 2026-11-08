import { skillLabel } from "../../utils/skillLabels.js";

function Distribution({ title, values = {} }) {
  const maximum = Math.max(1, ...Object.values(values));
  return (
    <section className="skill-panel">
      <p className="eyebrow">{title}</p>
      <div className="mt-5 space-y-3">
        {Object.entries(values).map(([label, count]) => (
          <div key={label}>
            <div className="flex justify-between gap-4 text-xs font-bold text-[#526b67]">
              <span>{skillLabel(label)}</span><span>{count}</span>
            </div>
            <div className="mt-1.5 h-2 bg-[#e5ebe6]">
              <span className="block h-full bg-[#e9794a] transition-all" style={{ width: `${(count / maximum) * 100}%` }} />
            </div>
          </div>
        ))}
        {!Object.keys(values).length && <p className="text-sm text-[#758682]">Add skills to build this distribution.</p>}
      </div>
    </section>
  );
}

function SkillOverview({ isLoading, overview, recommendations, onNavigate }) {
  if (isLoading && !overview) return <div className="profile-loading">Mapping your current skills…</div>;
  const summary = overview?.summary || { total: 0, currentlyLearning: 0, demonstrated: 0, verified: 0, categories: {}, proficiency: {} };
  const metrics = [
    ["Tracked skills", summary.total],
    ["Currently learning", summary.currentlyLearning],
    ["Demonstrated", summary.demonstrated],
    ["Verified", summary.verified],
  ];
  return (
    <div className="space-y-7">
      <section className="skill-metric-grid">
        {metrics.map(([label, value], index) => (
          <article key={label} className="skill-metric-card">
            <span className="skill-metric-index">0{index + 1}</span>
            <strong>{value}</strong>
            <p>{label}</p>
          </article>
        ))}
      </section>
      <div className="grid gap-6 lg:grid-cols-2">
        <Distribution title="Category distribution" values={summary.categories} />
        <Distribution title="Proficiency distribution" values={summary.proficiency} />
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.1fr_.9fr]">
        <section className="skill-panel">
          <div className="flex items-center justify-between gap-3">
            <div><p className="eyebrow">Recently updated</p><h2 className="mt-2 font-serif text-2xl text-[#214743]">Your active skill record</h2></div>
            <button type="button" className="profile-edit-link" onClick={() => onNavigate("my-skills")}>View all</button>
          </div>
          <div className="mt-5 divide-y divide-[#e0e6e1]">
            {(overview?.items || []).slice(0, 5).map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-4 py-3">
                <div><p className="font-bold text-[#294d49]">{item.skill.name}</p><p className="mt-1 text-xs text-[#7b8b87]">{skillLabel(item.skill.category)} · {skillLabel(item.learningStatus)}</p></div>
                <span className={`skill-status skill-status-${item.evidenceStatus}`}>{skillLabel(item.proficiency)}</span>
              </div>
            ))}
            {!overview?.items?.length && <div className="py-8 text-center"><p className="font-serif text-2xl text-[#294d49]">Your map starts empty.</p><button type="button" className="primary-button mt-4" onClick={() => onNavigate("my-skills")}>Add your first skill</button></div>}
          </div>
        </section>
        <section className="skill-panel skill-panel-dark">
          <p className="text-xs font-bold uppercase tracking-[.17em] text-[#f2a078]">Recommended next</p>
          <div className="mt-5 space-y-4">
            {(recommendations || []).slice(0, 3).map((item) => (
              <article key={item.skill.id} className="border-l-2 border-[#f19a69] pl-4">
                <div className="flex items-center justify-between gap-3"><h3 className="font-bold text-white">{item.skill.name}</h3><span className="text-[10px] font-bold uppercase tracking-wider text-[#a9cdc4]">{item.priority}</span></div>
                <p className="mt-2 text-xs leading-5 text-[#bcd2cc]">{item.reason}</p>
              </article>
            ))}
            {!recommendations?.length && <p className="text-sm leading-6 text-[#bcd2cc]">Add interests and skills to unlock curated next steps.</p>}
          </div>
          <button type="button" className="ai-outline-button mt-6" onClick={() => onNavigate("recommendations")}>Review all recommendations</button>
        </section>
      </div>
    </div>
  );
}

export default SkillOverview;
