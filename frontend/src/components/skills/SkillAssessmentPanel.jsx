import { useEffect, useState } from "react";
import {
  generateSkillAssessment,
  getSkillAiStatus,
  getSkillAssessment,
  getSkillAssessments,
  getSkillLibrary,
  submitSkillAssessment,
} from "../../services/skillApi.js";
import { skillLabel } from "../../utils/skillLabels.js";

const QUESTION_TYPES = [
  ["multiple_choice", "Multiple choice"],
  ["conceptual", "Conceptual"],
  ["code_output", "Code/output"],
  ["practical", "Practical scenario"],
  ["short_answer", "Short answer"],
  ["coding", "Coding exercise"],
];

function SkillAssessmentPanel({ initialSkillId = "" }) {
  const [skills, setSkills] = useState([]);
  const [history, setHistory] = useState([]);
  const [assessment, setAssessment] = useState(null);
  const [answers, setAnswers] = useState({});
  const [form, setForm] = useState({ skillId: initialSkillId, proficiencyLevel: "beginner", questionCount: 6, questionTypes: ["multiple_choice", "conceptual", "practical"] });
  const [available, setAvailable] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    Promise.all([getSkillLibrary({ page: 1, limit: 50 }), getSkillAssessments({ page: 1, limit: 20 }), getSkillAiStatus()])
      .then(([library, result, status]) => {
        if (!active) return;
        setSkills(library.items || []);
        setHistory(result.items || []);
        setAvailable(status.available);
      })
      .catch((requestError) => active && setError(requestError.message))
      .finally(() => active && setIsLoading(false));
    return () => { active = false; };
  }, []);

  function toggleType(type) {
    setForm((current) => ({
      ...current,
      questionTypes: current.questionTypes.includes(type)
        ? current.questionTypes.filter((item) => item !== type)
        : [...current.questionTypes, type],
    }));
  }

  async function generate(event) {
    event.preventDefault();
    setIsGenerating(true);
    setError("");
    try {
      const result = await generateSkillAssessment({ ...form, questionCount: Number(form.questionCount) });
      setAssessment(result.assessment);
      setAnswers({});
      setHistory((current) => [result.assessment, ...current]);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsGenerating(false);
    }
  }

  async function openAssessment(id) {
    setError("");
    try {
      const result = await getSkillAssessment(id);
      setAssessment(result.assessment);
      setAnswers(Object.fromEntries((result.assessment.answers || []).map((item) => [item.questionId, item.answer])));
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function submit(event) {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");
    try {
      const submitted = assessment.questions.map((question) => ({ questionId: question.id, answer: answers[question.id] || "" }));
      const result = await submitSkillAssessment(assessment.id, submitted);
      setAssessment(result.assessment);
      setHistory((current) => current.map((item) => item.id === assessment.id ? result.assessment : item));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) return <div className="profile-loading">Loading assessment workspace…</div>;

  const resultByQuestion = new Map((assessment?.answers || []).map((item) => [item.questionId, item]));
  return (
    <div className="assessment-layout">
      <aside className="space-y-5">
        <form className="skill-panel ai-generator-form" onSubmit={generate}>
          <p className="eyebrow">Knowledge check studio</p><h2>Generate an assessment</h2>
          <label>Skill<select required value={form.skillId} onChange={(event) => setForm((current) => ({ ...current, skillId: event.target.value }))}><option value="">Select a canonical skill</option>{skills.map((skill) => <option key={skill.id} value={skill.id}>{skill.name}</option>)}</select></label>
          <label>Target level<select value={form.proficiencyLevel} onChange={(event) => setForm((current) => ({ ...current, proficiencyLevel: event.target.value }))}>{["beginner", "intermediate", "advanced", "expert"].map((level) => <option key={level} value={level}>{skillLabel(level)}</option>)}</select></label>
          <label>Questions<select value={form.questionCount} onChange={(event) => setForm((current) => ({ ...current, questionCount: Number(event.target.value) }))}>{[3, 4, 5, 6, 8, 10].map((count) => <option key={count} value={count}>{count}</option>)}</select></label>
          <fieldset><legend>Question styles</legend><div className="assessment-type-grid">{QUESTION_TYPES.map(([value, label]) => <label key={value}><input type="checkbox" checked={form.questionTypes.includes(value)} onChange={() => toggleType(value)} /> <span>{label}</span></label>)}</div></fieldset>
          <button className="primary-button w-full" type="submit" disabled={!available || !form.skillId || !form.questionTypes.length || isGenerating}>{isGenerating ? "Generating…" : "Generate assessment"}</button>
          {!available && <small>New assessments are currently unavailable. Completed assessment history remains readable.</small>}
        </form>

        <section className="skill-panel assessment-history">
          <div className="skill-section-heading"><div><h3>Assessment history</h3><p>Results stay separate from proficiency</p></div><span>{history.length}</span></div>
          <div>{history.map((item) => <button key={item.id} type="button" className={assessment?.id === item.id ? "active" : ""} onClick={() => openAssessment(item.id)}><strong>{item.skill.name}</strong><span>{skillLabel(item.proficiencyLevel)} · {item.status}{item.status === "submitted" ? ` · ${item.percentage}%` : ""}</span></button>)}{!history.length && <p>No assessment history yet.</p>}</div>
        </section>
      </aside>

      <div className="space-y-5">
        {error && <div className="profile-alert profile-alert-error" role="alert">{error}</div>}
        {!assessment && <section className="skill-empty-state py-16"><p className="font-serif text-3xl">Test understanding without changing your profile.</p><small>Objective answers use fixed grading. Subjective answers follow the displayed evaluation rubric.</small></section>}
        {assessment && (
          <>
            <header className="assessment-header"><div><span className="ai-generated-label">Generated knowledge check</span><h2>{assessment.title}</h2><p>{assessment.skill.name} · {skillLabel(assessment.proficiencyLevel)}</p></div>{assessment.status === "submitted" && <div className="assessment-score"><strong>{assessment.percentage}%</strong><span>{assessment.score} / {assessment.maxScore} points</span></div>}</header>
            <section className="skill-panel assessment-instructions"><strong>Instructions</strong><ul>{assessment.instructions.map((instruction) => <li key={instruction}>{instruction}</li>)}</ul></section>
            <form onSubmit={submit} className="space-y-5">
              {assessment.questions.map((question, index) => {
                const result = resultByQuestion.get(question.id);
                return <article key={question.id} className="assessment-question"><header><span>Question {index + 1}</span><span>{skillLabel(question.type)} · {question.maxPoints} points</span></header><h3>{question.prompt}</h3>{question.type === "multiple_choice" ? <div className="assessment-options">{question.options.map((option) => <label key={option.id} className={answers[question.id] === option.id ? "selected" : ""}><input type="radio" name={question.id} value={option.id} checked={answers[question.id] === option.id} disabled={assessment.status === "submitted"} onChange={(event) => setAnswers((current) => ({ ...current, [question.id]: event.target.value }))} /><span>{option.text}</span></label>)}</div> : <label className="assessment-answer"><span>Your answer</span><textarea value={answers[question.id] || ""} onChange={(event) => setAnswers((current) => ({ ...current, [question.id]: event.target.value }))} disabled={assessment.status === "submitted"} rows={question.type === "coding" ? 8 : 5} placeholder={question.type === "coding" ? "Write your solution and explain key decisions…" : "Explain your reasoning…"} /></label>}{result && <div className={`assessment-feedback ${result.correct === true ? "correct" : result.correct === false ? "incorrect" : "reviewed"}`}><div><strong>{result.score} / {result.maxPoints} points</strong>{result.correct !== null && <span>{result.correct ? "Correct" : "Review needed"}</span>}</div><p>{result.feedback}</p>{result.areasToImprove?.length > 0 && <ul>{result.areasToImprove.map((area) => <li key={area}>{area}</li>)}</ul>}<details><summary>Explanation and rubric</summary><p>{question.explanation}</p>{question.referenceAnswer && <p><strong>Reference:</strong> {question.referenceAnswer}</p>}{question.rubric?.length > 0 && <ul>{question.rubric.map((item) => <li key={item.criterion}>{item.criterion} ({item.maxPoints} points)</li>)}</ul>}</details></div>}</article>;
              })}
              {assessment.status !== "submitted" && <button type="submit" className="primary-button assessment-submit" disabled={isSubmitting}>{isSubmitting ? "Evaluating…" : "Submit assessment"}</button>}
            </form>
            <p className="ai-disclaimer">Knowledge-check feedback supports reflection and does not independently verify proficiency.</p>
          </>
        )}
      </div>
    </div>
  );
}

export default SkillAssessmentPanel;
