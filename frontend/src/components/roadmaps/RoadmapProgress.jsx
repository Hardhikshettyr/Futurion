function RoadmapProgress({ progress }) {
  if (!progress) return null;
  return <section className="roadmap-progress" aria-label="Roadmap progress">
    <div className="roadmap-progress-ring" style={{ "--roadmap-progress": `${progress.completionPercentage}%` }}><strong>{progress.completionPercentage}%</strong><span>complete</span></div>
    <div className="roadmap-progress-copy"><p className="eyebrow">Actual task completion</p><h2>{progress.completedTasks} of {progress.totalTasks} tasks completed</h2><div className="roadmap-progress-track"><span style={{ width: `${progress.completionPercentage}%` }} /></div><div className="roadmap-progress-facts"><span><b>{progress.inProgressTasks}</b> in progress</span><span><b>{progress.remainingTasks}</b> not started</span><span><b>{progress.remainingHours}h</b> estimated remaining</span><span><b>{progress.estimatedWeeksRemaining}</b> estimated weeks</span>{progress.targetPlan && <span><b>{progress.targetPlan.requiredWeeklyHours === null ? "—" : `${progress.targetPlan.requiredWeeklyHours}h`}</b> weekly pace for target</span>}</div>{progress.nextTasks?.length > 0 && <div className="roadmap-next"><strong>Next available</strong>{progress.nextTasks.map((task) => <span key={task.taskId}>{task.title}</span>)}</div>}<small>{progress.estimateNote}{progress.targetPlan ? ` ${progress.targetPlan.note}` : ""}</small></div>
  </section>;
}

export default RoadmapProgress;
