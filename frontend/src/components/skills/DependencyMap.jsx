function Node({ skill, state, onSelect }) {
  const labels = {
    completed: "Completed prerequisite",
    in_progress: "In progress",
    tracked: "Tracked",
    current: "Current skill",
    missing: "Missing prerequisite",
    related: "Related skill",
    dependent: "Builds on this skill",
  };
  return (
    <button type="button" onClick={() => onSelect?.(skill)} className={`dependency-node dependency-node-${state}`}>
      <span>{skill.name}</span>
      <small>{labels[state] || "Not tracked"}</small>
    </button>
  );
}

function DependencyMap({ dependency, onSelect }) {
  if (!dependency) return <div className="profile-loading">Loading dependency map…</div>;
  const tracked = new Set(dependency.trackedSkillIds || []);
  const direct = dependency.directPrerequisites || dependency.prerequisites.map((skill) => ({
    ...skill,
    completionStatus: tracked.has(skill.id) ? "tracked" : "missing",
    relationship: { importance: "essential", minimumProficiency: "beginner", requiredForLevels: [] },
  }));
  return (
    <div>
      <section className="dependency-explainer"><div><p className="eyebrow">How to read this map</p><h3>Foundations appear before the current skill; skills that build on it appear after.</h3><p>Each connection comes from a relationship recorded in the Skill Library. A “missing prerequisite” means the foundational skill is not in your tracked skills—it does not prove that you lack the knowledge.</p></div><ul><li><b>Prerequisites</b><span>Foundational skills recorded before this skill</span></li><li><b>Current skill</b><span>The skill whose relationships you are reviewing</span></li><li><b>Builds toward</b><span>Skills that use this capability as a foundation</span></li></ul></section>
      <div className="dependency-map" aria-label={`Dependency map for ${dependency.skill.name}`}>
        <div className="dependency-column">
          <p>Prerequisites</p>
          {direct.map((skill) => <div key={skill.id} className="dependency-node-wrap"><Node skill={skill} state={skill.completionStatus} onSelect={onSelect} /><small>{skill.relationship.importance} · {skill.relationship.minimumProficiency}+</small></div>)}
          {!direct.length && <span className="dependency-empty">Prerequisite information has not been provided.</span>}
        </div>
        <div className="dependency-current"><Node skill={dependency.skill} state="current" /></div>
        <div className="dependency-column">
          <p>Builds toward</p>
          {dependency.dependents.map((skill) => <Node key={skill.id} skill={skill} state={tracked.has(skill.id) ? "tracked" : "dependent"} onSelect={onSelect} />)}
          {!dependency.dependents.length && <span className="dependency-empty">No dependents mapped</span>}
        </div>
      </div>
      <div className="mt-5 border-t border-[#dce4de] pt-4">
        <p className="text-xs font-bold uppercase tracking-wider text-[#6d817c]">Accessible relationship list</p>
        <ul className="mt-2 space-y-1 text-sm text-[#5d726d]">
          <li>Direct prerequisites: {direct.map((item) => `${item.name} (${item.completionStatus.replaceAll("_", " ")})`).join(", ") || "None recorded"}</li>
          <li>Related: {dependency.relatedSkills.map((item) => item.name).join(", ") || "None"}</li>
          <li>Dependent skills: {dependency.dependents.map((item) => item.name).join(", ") || "None"}</li>
        </ul>
      </div>
      {dependency.learningSequence?.length > 0 && (
        <div className="dependency-sequence">
          <p className="text-xs font-bold uppercase tracking-wider text-[#6d817c]">Suggested learning sequence</p>
          <ol>{dependency.learningSequence.map((item, index) => <li key={item.id} className={item.status === "tracked" ? "tracked" : ""}><span>{index + 1}</span><div><strong>{item.name}</strong><small>{item.status === "tracked" ? `${item.proficiency} · ${item.learningStatus}` : "Not tracked"}</small></div></li>)}</ol>
          <small>Sequence follows configured prerequisite order; it is planning guidance, not a required curriculum.</small>
        </div>
      )}
    </div>
  );
}

export default DependencyMap;
