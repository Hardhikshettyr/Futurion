import { useEffect, useMemo, useState } from "react";
import {
  generateLearningStrategy,
  getLearningStrategies,
  getSkillAiStatus,
  getSkillLibrary,
  updateLearningStrategy,
} from "../../services/skillApi.js";
import { skillLabel } from "../../utils/skillLabels.js";

function LearningStrategyPanel({ initialSkillId = "" }) {
  const [skills, setSkills] = useState([]);
  const [strategies, setStrategies] = useState([]);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ skillId: initialSkillId, requiredProficiency: "intermediate", preferredLearningTime: "" });
  const [notes, setNotes] = useState("");
  const [available, setAvailable] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    Promise.all([getSkillLibrary({ page: 1, limit: 50 }), getLearningStrategies({ page: 1, limit: 20 }), getSkillAiStatus()])
      .then(([library, history, status]) => {
        if (!active) return;
        setSkills(library.items || []);
        setStrategies(history.items || []);
        setAvailable(status.available);
        if (history.items?.length) {
          setSelected(history.items[0]);
          setNotes(history.items[0].studentNotes || "");
        }
      })
      .catch((requestError) => active && setError(requestError.message))
      .finally(() => active && setIsLoading(false));
    return () => { active = false; };
  }, []);

  const targetSkill = useMemo(() => skills.find((skill) => skill.id === form.skillId), [form.skillId, skills]);

  async function generate(event) {
    event.preventDefault();
    if (!form.skillId) return;
    setIsGenerating(true);
    setError("");
    setMessage("");
    try {
      const result = await generateLearningStrategy(form);
      setSelected(result.learningStrategy);
      setNotes("");
      setStrategies((current) => [result.learningStrategy, ...current]);
      setMessage("Draft strategy generated. Review it before saving.");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsGenerating(false);
    }
  }

  async function save() {
    if (!selected) return;
    setIsSaving(true);
    setError("");
    try {
      const result = await updateLearningStrategy(selected.id, { status: "saved", studentNotes: notes });
      setSelected(result.learningStrategy);
      setStrategies((current) => current.map((item) => item.id === selected.id ? result.learningStrategy : item));
      setMessage("Learning strategy saved.");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) return <div className="profile-loading">Loading learning strategies…</div>;

  const strategy = selected?.strategy;
  return (
    <div className="learning-strategy-layout">
      <aside className="space-y-5">
        <form className="skill-panel ai-generator-form" onSubmit={generate}>
          <p className="eyebrow">Personalized learning strategy</p>
          <h2>Choose a target</h2>
          <label>Target skill<select value={form.skillId} onChange={(event) => setForm((current) => ({ ...current, skillId: event.target.value }))} required><option value="">Select a canonical skill</option>{skills.map((skill) => <option key={skill.id} value={skill.id}>{skill.name}</option>)}</select></label>
          <label>Required proficiency<select value={form.requiredProficiency} onChange={(event) => setForm((current) => ({ ...current, requiredProficiency: event.target.value }))}>{["beginner", "intermediate", "advanced", "expert"].map((level) => <option key={level} value={level}>{skillLabel(level)}</option>)}</select></label>
          <label>Preferred learning time <span>(optional)</span><input value={form.preferredLearningTime} onChange={(event) => setForm((current) => ({ ...current, preferredLearningTime: event.target.value }))} maxLength={240} placeholder="Example: two focused evenings each week" /></label>
          {targetSkill && <p className="ai-form-context">{targetSkill.description}</p>}
          <button className="primary-button w-full" type="submit" disabled={!available || !form.skillId || isGenerating}>{isGenerating ? "Building strategy…" : "Generate draft"}</button>
          {!available && <small>Learning recommendations are temporarily unavailable. Existing saved strategies remain readable.</small>}
        </form>

        <section className="skill-panel strategy-history">
          <div className="skill-section-heading"><div><h3>Saved history</h3><p>Drafts and plans you reviewed</p></div><span>{strategies.length}</span></div>
          <div className="strategy-history-list">
            {strategies.map((item) => <button key={item.id} type="button" className={selected?.id === item.id ? "active" : ""} onClick={() => { setSelected(item); setNotes(item.studentNotes || ""); }}><strong>{item.targetSkill.name}</strong><span>{skillLabel(item.requiredProficiency)} · {item.status}</span></button>)}
            {!strategies.length && <p>No strategies generated yet.</p>}
          </div>
        </section>
      </aside>

      <div className="space-y-5">
        {message && <div className="profile-alert profile-alert-success" role="status">{message}</div>}
        {error && <div className="profile-alert profile-alert-error" role="alert">{error}</div>}
        {!strategy && <section className="skill-empty-state py-16"><p className="font-serif text-3xl">Build a strategy you can inspect.</p><small>Futurion uses real prerequisites and your recorded context. It does not create a Career Roadmap.</small></section>}
        {strategy && (
          <>
            <section className="strategy-header">
              <div><span className="ai-generated-label">Recommendation draft · {selected.status}</span><h2>{strategy.title}</h2><p>{strategy.learningObjective}</p></div>
              <div className="strategy-target"><span>Target</span><strong>{selected.targetSkill.name}</strong><small>{skillLabel(selected.currentProficiency || "not recorded")} → {skillLabel(selected.requiredProficiency)}</small></div>
            </section>

            <section className="skill-panel">
              <div className="skill-section-heading"><div><h3>Prerequisite check</h3><p>Recorded library relationships and clearly marked recommendations</p></div></div>
              <div className="strategy-prerequisites">{strategy.prerequisites.map((item, index) => <article key={`${item.skillName}-${index}`}><span className={`strategy-status strategy-status-${item.status}`}>{skillLabel(item.status)}</span><h4>{item.skillName}</h4><p>{item.reason}</p><small>{item.source === "skill_library" ? "Recorded Skill Library relationship" : "Suggested relationship"}</small></article>)}</div>
              {!strategy.prerequisites.length && <p className="dependency-empty">No prerequisite relationship is configured; the strategy does not invent one.</p>}
            </section>

            <section className="strategy-stages" aria-label="Ordered learning stages">
              {strategy.stages.map((stage) => <article key={stage.order} className="strategy-stage"><div className="strategy-stage-number">{stage.order}</div><div><h3>{stage.title}</h3><p>{stage.objective}</p><div className="strategy-stage-columns"><div><strong>Topics</strong><ul>{stage.topics.map((topic) => <li key={topic}>{topic}</li>)}</ul></div><div><strong>Practice</strong><ul>{stage.practicalExercises.map((exercise) => <li key={exercise}>{exercise}</li>)}</ul></div><div><strong>Ready when</strong><ul>{stage.completionCriteria.map((criterion) => <li key={criterion}>{criterion}</li>)}</ul></div></div></div></article>)}
            </section>

            <div className="strategy-support-grid">
              <section className="skill-panel"><h3>Suggested projects or activities</h3><ul>{strategy.suggestedProjects.map((item) => <li key={item}>{item}</li>)}</ul></section>
              <section className="skill-panel"><h3>How to demonstrate the skill</h3><ul>{strategy.howToDemonstrate.map((item) => <li key={item}>{item}</li>)}</ul></section>
              <section className="skill-panel"><h3>Completion criteria</h3><ul>{strategy.completionCriteria.map((item) => <li key={item}>{item}</li>)}</ul></section>
            </div>

            {!strategy.resourceRecommendations.length && <div className="ai-limitations"><strong>No linked resources available</strong><p>Recommendations only include resources recorded in Futurion, so no unverified providers or links are shown.</p></div>}

            <section className="skill-panel strategy-review"><label>Your review notes<textarea value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={2000} rows={4} placeholder="Record what you want to adjust or remember." /></label><button type="button" className="primary-button" disabled={isSaving} onClick={save}>{isSaving ? "Saving…" : selected.status === "saved" ? "Save updates" : "Approve and save"}</button></section>
            <p className="ai-disclaimer">Review this recommendation against your goals and available time before treating it as a plan.</p>
          </>
        )}
      </div>
    </div>
  );
}

export default LearningStrategyPanel;
