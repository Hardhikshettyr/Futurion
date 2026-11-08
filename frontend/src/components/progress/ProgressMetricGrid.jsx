const metricDefinitions = [
  ["skillsDeveloped", "Skills developed", "Recorded in Skill Intelligence"],
  ["skillsWithEvidence", "Evidence-supported skills", "Demonstrated, verified or linked evidence"],
  ["projects", "Projects", "Documented in your profile"],
  ["certifications", "Certifications", "Documented in your profile"],
  ["completedLearningResources", "Learning completed", "Resources marked complete"],
  ["opportunitiesTracked", "Opportunities tracked", "Student-maintained applications"],
];

function ProgressMetricGrid({ metrics }) {
  return <section className="progress-metrics" aria-label="Recorded progress metrics">
    {metricDefinitions.map(([key, label, description], index) => <article key={key}><span>{String(index + 1).padStart(2, "0")}</span><strong>{metrics?.[key] || 0}</strong><h3>{label}</h3><p>{description}</p></article>)}
    <article className="progress-roadmap-metric"><span>07</span><strong>{metrics?.roadmapCompletion?.percentage || 0}%</strong><h3>Roadmap completion</h3><p>{metrics?.roadmapCompletion?.completedTasks || 0} of {metrics?.roadmapCompletion?.totalTasks || 0} active tasks completed</p></article>
  </section>;
}

export default ProgressMetricGrid;
