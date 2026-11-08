import { useState } from "react";
import { Link } from "react-router-dom";
import { addStudentSkill } from "../../services/skillApi.js";
import { skillLabel } from "../../utils/skillLabels.js";

function RecommendationsPanel({ items, isLoading, methodology, onAdded }) {
  const [workingId, setWorkingId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function accept(item) {
    setWorkingId(item.skill.id);
    setError("");
    setMessage("");
    try {
      await addStudentSkill({ skillId: item.skill.id, proficiency: "beginner", learningStatus: "learning", description: "", notes: `Added from ${skillLabel(item.recommendationType)} recommendation.` });
      setMessage(`${item.skill.name} was added to your learning list at beginner proficiency.`);
      await onAdded();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setWorkingId("");
    }
  }

  if (isLoading && !items.length) return <div className="profile-loading">Applying curated recommendation rules…</div>;
  return (
    <div className="space-y-6">
      <section className="skill-panel skill-methodology"><p className="eyebrow">Transparent recommendations</p><h2 className="mt-2 font-serif text-3xl text-[#214743]">Why these skills appear</h2><p className="mt-3 max-w-3xl text-sm leading-6 text-[#637873]">{methodology || "Recommendations use the curated skill graph and your existing profile."}</p></section>
      {message && <div role="status" className="profile-alert profile-alert-success">{message}</div>}
      {error && <div role="alert" className="profile-alert profile-alert-error">{error}</div>}
      <section className="skill-card-grid">
        {items.map((item) => <article key={item.skill.id} className="skill-recommendation-card"><div className="flex items-center justify-between gap-3"><span className={`recommendation-priority recommendation-priority-${item.priority}`}>{item.priority} priority</span><span className="text-[10px] font-bold uppercase tracking-wider text-[#788985]">{skillLabel(item.recommendationType)}</span></div><h3 className="mt-5 font-serif text-2xl text-[#214743]">{item.skill.name}</h3><p className="mt-3 text-sm leading-6 text-[#5f746f]">{item.reason}</p>{item.basis?.length > 0 && <div className="recommendation-basis"><strong>Why this appears</strong>{item.basis.map((basis) => <span key={basis}>{basis}</span>)}</div>}{item.nextSteps && <div className="recommendation-next"><strong>What to do next</strong><p>{item.nextSteps}</p></div>}{item.relevantExistingSkills.length > 0 && <div className="mt-4"><p className="text-[10px] font-bold uppercase tracking-wider text-[#82918e]">Connects to</p><div className="mt-2 flex flex-wrap gap-2">{item.relevantExistingSkills.map((skill) => <span key={skill.id} className="profile-chip">{skill.name}</span>)}</div></div>}{item.missingPrerequisites.length > 0 && <div className="mt-4 border-l-2 border-[#d9a36c] pl-3"><p className="text-xs font-bold text-[#765448]">Prerequisites to build first</p><p className="mt-1 text-xs text-[#80695d]">{item.missingPrerequisites.map((skill) => skill.name).join(", ")}</p></div>}{item.isTracked ? <Link to="/dashboard/skills?view=my-skills" className="secondary-button mt-6 block w-full text-center">Review tracked skill</Link> : <button type="button" onClick={() => accept(item)} disabled={workingId === item.skill.id} className="primary-button mt-6 w-full">{workingId === item.skill.id ? "Adding…" : "Add to learning list"}</button>}<p className="mt-2 text-center text-[10px] leading-4 text-[#84938f]">Suggestions never claim proficiency or verified evidence.</p></article>)}
      </section>
      {!items.length && <div className="skill-empty-state py-12"><p className="font-serif text-3xl">No new recommendations right now.</p><small>Keep your skills, interests, and learning statuses current.</small></div>}
    </div>
  );
}

export default RecommendationsPanel;
