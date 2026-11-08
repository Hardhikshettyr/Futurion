import AlignmentMeter from "./AlignmentMeter.jsx";

function Items({ values, valueFor = (item) => item, empty = "Nothing is recorded for this section." }) {
  return values?.length ? <ul className="decision-list">{values.map((item, index) => <li key={`${valueFor(item)}-${index}`}>{valueFor(item)}</li>)}</ul> : <p className="decision-empty-inline">{empty}</p>;
}

function ScenarioAnalysisPanel({ analysis }) {
  const actual = analysis.actualBaseline;
  const simulated = analysis.simulated;
  const delta = analysis.differences.alignmentScoreChange;
  const skillFactor = simulated.alignment.contributions.find((item) => item.factor === "skills");
  return <section className="scenario-analysis-panel">
    <header><div><p className="eyebrow">Scenario analysis</p><h2>{analysis.targetCareer.title}</h2><span>{analysis.targetCareer.industry} · {analysis.targetCareer.categoryLabel}</span></div><div className="scenario-delta"><strong>{delta === null ? "—" : `${delta >= 0 ? "+" : ""}${delta}`}<small>alignment-point change</small></strong></div></header>
    <div className="scenario-baseline-grid">
      <article><span>Actual profile</span><strong>{actual.alignment.score === null ? "—" : `${actual.alignment.score}%`}</strong><small>{actual.alignment.availableWeight}% available weight</small></article>
      <article className="scenario-simulated"><span>Scenario-only view</span><strong>{simulated.alignment.score === null ? "—" : `${simulated.alignment.score}%`}</strong><small>{simulated.alignment.availableWeight}% available weight</small></article>
    </div>
    <AlignmentMeter label="Simulated skill alignment" value={skillFactor?.rawScore} />
    <div className="scenario-analysis-grid">
      <article><h3>Hypothetical changes</h3><Items values={analysis.differences.hypotheticalInputs} valueFor={(item) => `${item.skill.name}: ${item.actualProficiency || "not recorded"} → ${item.proficiency} (${item.source.replaceAll("_", " ")})`} empty="No hypothetical skill changes. This scenario currently mirrors the selected starting point." /><Items values={analysis.differences.hypotheticalQualifications} valueFor={(item) => `Qualification assumption: ${item}`} empty="No hypothetical qualification added." /></article>
      <article><h3>Newly aligned skills</h3><Items values={analysis.differences.newlyAlignedSkills} valueFor={(item) => `${item.skill.name} · scenario ${item.currentProficiency}`} empty="No additional skill reaches the listed target yet." /></article>
      <article><h3>Remaining gaps</h3><Items values={analysis.differences.remainingSkillGaps} valueFor={(item) => `${item.skill.name} · ${item.currentProficiency ? `${item.currentProficiency} → ${item.requiredProficiency}` : `not recorded · target ${item.requiredProficiency}`}`} empty={skillFactor?.available ? "No remaining recorded skill gap was identified." : "Unknown until actual or hypothetical skills are provided."} /></article>
      <article><h3>Preparation priorities</h3><Items values={simulated.preparation.priorities} /></article>
      <article><h3>Education pathways</h3><p className="decision-explanation !mt-0">{simulated.alignment.educationAlignment.explanation}</p><Items values={simulated.career.requiredEducation} valueFor={(item) => `${item.pathwayType}: ${item.qualification}`} /></article>
      <article><h3>Projects and evidence</h3><Items values={simulated.application.suggestedProjectAreas} valueFor={(item) => item.suggestion} /><Items values={simulated.preparation.evidenceGaps} valueFor={(item) => `${item.skill.name}: ${item.message}`} /></article>
    </div>
    <div className="scenario-learning-context"><span><strong>{analysis.learningContext.weeklyLearningHours}</strong> hours/week</span><span><strong>{analysis.learningContext.learningPreferences.map((item) => item.replaceAll("_", " ")).join(" · ")}</strong> learning approach</span><span><strong>{analysis.learningContext.targetDate ? new Date(analysis.learningContext.targetDate).toLocaleDateString() : "No target date"}</strong> planning horizon</span><p>{analysis.learningContext.statement}</p></div>
    <p className="scenario-disclaimer">{analysis.disclaimer}</p>
  </section>;
}

export default ScenarioAnalysisPanel;
