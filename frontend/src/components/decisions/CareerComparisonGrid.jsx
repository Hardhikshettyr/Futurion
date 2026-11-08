import AlignmentMeter from "./AlignmentMeter.jsx";

function Empty({ children = "No recorded match is available for this dimension." }) {
  return <p className="decision-empty-inline">{children}</p>;
}

function Items({ values, valueFor = (item) => item }) {
  return values?.length ? <ul className="decision-list">{values.map((item, index) => <li key={`${valueFor(item)}-${index}`}>{valueFor(item)}</li>)}</ul> : <Empty />;
}

function SkillColumn({ item }) {
  const skillFactor = item.alignment.contributions.find((entry) => entry.factor === "skills");
  if (!skillFactor?.available) return <>
    <AlignmentMeter label="Skill alignment" value={null} />
    <p className="decision-explanation">Skill alignment is unknown because this profile has no recorded skill data. Career requirements are shown below without classifying them as student gaps.</p>
    <h4 className="decision-subtitle">Unassessed career requirements</h4>
    <Items values={item.alignment.unassessedSkills} valueFor={(entry) => `${entry.skill.name} · ${entry.importance} · target ${entry.requiredProficiency}`} />
  </>;
  return <>
    <AlignmentMeter label="Skill alignment" value={skillFactor?.rawScore} />
    <h4 className="decision-subtitle">Matching skills</h4>
    <Items values={item.alignment.matchingSkills} valueFor={(entry) => `${entry.skill.name} · ${entry.currentProficiency} (${entry.evidenceStatus.replaceAll("_", " ")})`} />
    <h4 className="decision-subtitle">Missing skills</h4>
    <Items values={item.alignment.missingSkills} valueFor={(entry) => `${entry.skill.name} · ${entry.importance} · target ${entry.requiredProficiency}`} />
    <h4 className="decision-subtitle">Proficiency improvements</h4>
    <Items values={item.alignment.skillsRequiringImprovement} valueFor={(entry) => `${entry.skill.name}: ${entry.currentProficiency} → ${entry.requiredProficiency}`} />
    <h4 className="decision-subtitle">Prerequisites requiring attention</h4>
    <Items values={item.preparation.missingPrerequisites} valueFor={(entry) => `${entry.skill.name} · ${entry.status} · ${entry.minimumProficiency}+`} />
    <h4 className="decision-subtitle">Evidence gaps</h4>
    <Items values={item.preparation.evidenceGaps} valueFor={(entry) => `${entry.skill.name}: ${entry.message}`} />
  </>;
}

function EducationColumn({ item }) {
  const educationFactor = item.alignment.contributions.find((entry) => entry.factor === "education");
  return <>
    <AlignmentMeter label="Education alignment" value={educationFactor?.rawScore} />
    <p className="decision-explanation">{item.alignment.educationAlignment.explanation}</p>
    <h4 className="decision-subtitle">Accepted disciplines</h4>
    <Items values={item.career.acceptedDisciplines} valueFor={(entry) => `${entry.name} · ${entry.alignment}`} />
    <h4 className="decision-subtitle">Qualification pathways</h4>
    <div className="space-y-3">{item.career.requiredEducation.map((pathway, index) => <article key={`${pathway.qualification}-${index}`} className="decision-path"><span>{pathway.pathwayType}</span><strong>{pathway.qualification}</strong><p>{pathway.description}</p></article>)}</div>
    <h4 className="decision-subtitle">Cross-discipline considerations</h4>
    <Items values={item.alignment.crossDisciplinePathways} valueFor={(entry) => entry.whyRelevant} />
  </>;
}

function CertificationColumn({ item }) {
  return <>
    <h4 className="decision-subtitle !mt-0">Required where applicable</h4>
    {item.certifications.required.length ? item.certifications.required.map((entry) => <div key={entry.name} className="decision-status-row"><span><strong>{entry.name}</strong><small>{entry.issuer || "Issuer varies"}</small></span><b className={entry.alreadyHeld ? "decision-status-positive" : ""}>{entry.alreadyHeld ? "Recorded" : "Not recorded"}</b></div>) : <Empty>No required certification is recorded in the Career Library.</Empty>}
    <h4 className="decision-subtitle">Recommended, not mandatory</h4>
    {item.certifications.recommended.length ? item.certifications.recommended.map((entry) => <div key={entry.name} className="decision-status-row"><span><strong>{entry.name}</strong><small>{entry.issuer || "Issuer varies"}</small></span><b className={entry.alreadyHeld ? "decision-status-positive" : ""}>{entry.alreadyHeld ? "Recorded" : "Optional"}</b></div>) : <Empty>No recommended certification is recorded.</Empty>}
    <h4 className="decision-subtitle">Relevant certifications already held</h4>
    <Items values={item.certifications.relevantHeld} valueFor={(entry) => `${entry.name} · ${entry.issuer}`} />
    <p className="decision-explanation">{item.certifications.explanation}</p>
  </>;
}

function PreparationColumn({ item }) {
  return <>
    {item.preparation.unassessedRequirements?.length > 0 && <><p className="decision-explanation !mt-0">Skill preparation remains unassessed until the student records skills. These are Career Library requirements, not confirmed gaps.</p><h4 className="decision-subtitle">Unassessed skill requirements</h4><Items values={item.preparation.unassessedRequirements} valueFor={(entry) => `${entry.skill.name} · target ${entry.requiredProficiency}`} /></>}
    <h4 className="decision-subtitle !mt-0">Preparation priorities</h4><Items values={item.preparation.priorities} />
    <h4 className="decision-subtitle">Foundational gaps</h4><Items values={item.preparation.missingFoundations} valueFor={(entry) => entry.skill.name} />
    <h4 className="decision-subtitle">Advanced competency gaps</h4><Items values={item.preparation.missingAdvancedCompetencies} valueFor={(entry) => `${entry.skill.name} · target ${entry.requiredProficiency}`} />
    <h4 className="decision-subtitle">Portfolio gaps</h4><Items values={item.application.portfolioGaps} />
    <h4 className="decision-subtitle">Suggested project areas</h4><Items values={item.application.suggestedProjectAreas} valueFor={(entry) => entry.suggestion} />
    <h4 className="decision-subtitle">Verified learning resources</h4>{item.preparation.learningResources.length ? <ul className="decision-list">{item.preparation.learningResources.map((entry) => <li key={entry.url}><a href={entry.url} target="_blank" rel="noreferrer" className="font-bold underline">{entry.title} ↗</a></li>)}</ul> : <Empty>No verified resource link is currently recorded.</Empty>}
  </>;
}

function ProgressionColumn({ item }) {
  return <div className="decision-progression">{item.career.careerProgression.length ? item.career.careerProgression.map((stage, index) => <article key={`${stage.level}-${index}`}><span>{String(index + 1).padStart(2, "0")}</span><div><small>{stage.level}</small><strong>{stage.roles.join(" · ")}</strong><p>{stage.description}</p></div></article>) : <Empty />}</div>;
}

function OverviewColumn({ item }) {
  return <>
    <p className="decision-explanation !mt-0">{item.career.overview}</p>
    <h4 className="decision-subtitle">Responsibilities</h4><Items values={item.career.responsibilities} />
    <h4 className="decision-subtitle">Work environments</h4><Items values={item.career.workEnvironments} />
    <h4 className="decision-subtitle">Work modes</h4><div className="flex flex-wrap gap-2">{item.career.workModes.map((value) => <span key={value} className="career-chip">{value.replaceAll("_", " ")}</span>)}</div>
    <h4 className="decision-subtitle">Employment types</h4><div className="flex flex-wrap gap-2">{item.career.employmentTypes.map((value) => <span key={value} className="career-chip">{value.replaceAll("_", " ")}</span>)}</div>
    <h4 className="decision-subtitle">Profile strengths</h4><Items values={item.strengths} />
    <h4 className="decision-subtitle">Trade-offs to investigate</h4><Items values={item.tradeoffs} />
  </>;
}

function CareerComparisonGrid({ careers, tab, onRemove }) {
  const content = { overview: OverviewColumn, skills: SkillColumn, education: EducationColumn, certifications: CertificationColumn, preparation: PreparationColumn, progression: ProgressionColumn }[tab] || OverviewColumn;
  const Content = content;
  return (
    <div className="decision-comparison-scroll" tabIndex="0" aria-label="Career comparison columns">
      <div className="decision-comparison-grid" style={{ "--decision-columns": careers.length }}>
        {careers.map((item) => <article key={item.career.id} className="decision-column">
          <header><div><p>{item.career.categoryLabel}</p><h3>{item.career.title}</h3><small>{item.career.industry}</small></div><button type="button" onClick={() => onRemove(item.career.id)} aria-label={`Remove ${item.career.title}`}>×</button></header>
          <div className="decision-score"><span>{item.alignment.score ?? "—"}<small>{item.alignment.score === null ? "unknown" : "alignment"}</small></span><div><b>{item.alignment.confidence} confidence</b><small>{item.alignment.availableWeight}% available factor weight</small></div></div>
          <div className="decision-column-body"><Content item={item} /></div>
        </article>)}
      </div>
    </div>
  );
}

export default CareerComparisonGrid;
