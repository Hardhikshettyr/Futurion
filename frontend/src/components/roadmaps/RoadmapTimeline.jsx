const labels = { not_started: "Not started", in_progress: "In progress", completed: "Completed" };

function RoadmapTimeline({ roadmap, busyTaskId, onTaskStatus }) {
  const completed = new Set(roadmap.stages.flatMap((stage) => stage.tasks).filter((task) => task.status === "completed").map((task) => task.id));
  return <section className="roadmap-timeline">
    {roadmap.stages.map((stage) => {
      const stageProgress = roadmap.progress.stageProgress.find((item) => item.stageKey === stage.stageKey);
      const activeTasks = stage.tasks.filter((task) => !task.retired);
      return <article className="roadmap-stage" key={stage.stageKey}>
        <header><span>{String(stage.displayOrder + 1).padStart(2, "0")}</span><div><p className="eyebrow">{stageProgress?.status?.replaceAll("_", " ")}</p><h2>{stage.title}</h2><p>{stage.description}</p></div><strong>{stageProgress?.completionPercentage || 0}%</strong></header>
        <div className="roadmap-task-list">{activeTasks.length ? activeTasks.map((task) => {
          const locked = task.dependsOnTaskIds.some((id) => !completed.has(id));
          return <section className={`roadmap-task roadmap-task-${task.status}`} key={task.id}>
            <div className="roadmap-task-marker" aria-hidden="true" />
            <div className="roadmap-task-body"><div className="roadmap-task-heading"><div><span>{task.taskType.replaceAll("_", " ")}{task.required ? " · required" : " · optional"}</span><h3>{task.title}</h3></div><b>{task.estimatedHours}h</b></div><p>{task.description}</p>
              {task.relatedSkills.length > 0 && <div className="roadmap-chips">{task.relatedSkills.map((skill) => <span key={skill.id}>{skill.name}</span>)}</div>}
              {task.linkedResources.length > 0 && <div className="roadmap-resources"><strong>Linked learning resources</strong>{task.linkedResources.map((resource) => <a key={resource.id} href={resource.externalUrl} target="_blank" rel="noreferrer"><span>{resource.title}</span><small>{resource.provider} · {resource.difficulty}</small></a>)}</div>}
              <div className="roadmap-task-actions"><label>Status<select className="field-input" value={task.status} disabled={roadmap.status === "archived" || busyTaskId === task.id} onChange={(event) => onTaskStatus(task.id, event.target.value)}><option value="not_started">{labels.not_started}</option><option value="in_progress" disabled={locked}>{labels.in_progress}</option><option value="completed" disabled={locked}>{labels.completed}</option></select></label>{locked && <small>Complete prerequisite tasks first.</small>}</div>
            </div>
          </section>;
        }) : <p className="roadmap-empty-stage">No active tasks in this stage.</p>}</div>
      </article>;
    })}
    {roadmap.stages.some((stage) => stage.tasks.some((task) => task.retired)) && <details className="roadmap-history"><summary>View preserved task history</summary>{roadmap.stages.flatMap((stage) => stage.tasks.filter((task) => task.retired)).map((task) => <p key={task.id}><strong>{task.title}</strong><span>{task.status.replaceAll("_", " ")} · {task.retirementReason}</span></p>)}</details>}
  </section>;
}

export default RoadmapTimeline;
