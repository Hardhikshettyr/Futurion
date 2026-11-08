import AlignmentMeter from "./AlignmentMeter.jsx";

function ScenarioComparisonGrid({ comparison }) {
  return <div className="decision-comparison-scroll" tabIndex="0" aria-label="Scenario comparison columns"><div className="decision-comparison-grid" style={{ "--decision-columns": comparison.scenarios.length }}>
    {comparison.scenarios.map((analysis) => {
      const skillFactor = analysis.simulated.alignment.contributions.find((item) => item.factor === "skills");
      return <article className="decision-column scenario-compare-column" key={analysis.scenario.id}>
        <header><div><p>{analysis.scenario.startingPointType.replaceAll("_", " ")}</p><h3>{analysis.scenario.name}</h3><small>{analysis.targetCareer.title}</small></div></header>
        <div className="scenario-baseline-grid"><article><span>Actual</span><strong>{analysis.actualBaseline.alignment.score ?? "—"}%</strong></article><article className="scenario-simulated"><span>Scenario</span><strong>{analysis.simulated.alignment.score ?? "—"}%</strong></article></div>
        <div className="decision-column-body"><AlignmentMeter label="Skill alignment" value={skillFactor?.rawScore} /><h4 className="decision-subtitle">Uses existing experience</h4><p className="decision-explanation">{analysis.actualBaseline.application.relevantExperience.length} relevant experience item(s) and {analysis.actualBaseline.application.relevantProjects.length} project(s) recorded.</p><h4 className="decision-subtitle">Hypothetical changes</h4><ul className="decision-list">{analysis.differences.hypotheticalInputs.map((item) => <li key={item.skill.id}>{item.skill.name} → {item.proficiency}</li>)}</ul><h4 className="decision-subtitle">Remaining gaps</h4><ul className="decision-list">{analysis.differences.remainingSkillGaps.map((item) => <li key={item.skill.id}>{item.skill.name} · target {item.requiredProficiency}</li>)}</ul><h4 className="decision-subtitle">Education requirements</h4><ul className="decision-list">{analysis.simulated.career.requiredEducation.map((item, index) => <li key={`${item.qualification}-${index}`}>{item.pathwayType}: {item.qualification}</li>)}</ul><h4 className="decision-subtitle">Learning priorities</h4><ul className="decision-list">{analysis.simulated.preparation.priorities.map((item) => <li key={item}>{item}</li>)}</ul></div>
      </article>;
    })}
  </div></div>;
}

export default ScenarioComparisonGrid;
