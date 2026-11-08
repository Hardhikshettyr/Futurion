import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import RoadmapTimeline from "./RoadmapTimeline.jsx";

function task(values) {
  return { id: values.id, taskType: "skill_development", title: values.title, description: "Build this skill", relatedSkills: [], linkedResources: [], dependsOnTaskIds: values.dependsOnTaskIds || [], estimatedHours: 6, status: values.status || "not_started", required: true, retired: false };
}

describe("RoadmapTimeline", () => {
  it("shows prerequisite locking and sends a selected status update", () => {
    const onTaskStatus = vi.fn();
    const first = task({ id: "first", title: "Learn foundations" });
    const second = task({ id: "second", title: "Develop core skill", dependsOnTaskIds: ["first"] });
    render(<RoadmapTimeline roadmap={{ status: "active", progress: { stageProgress: [{ stageKey: "core_skills", status: "not_started", completionPercentage: 0 }] }, stages: [{ stageKey: "core_skills", title: "Core skills", description: "Build core skills", displayOrder: 0, tasks: [first, second] }] }} busyTaskId="" onTaskStatus={onTaskStatus} />);
    expect(screen.getByText(/complete prerequisite tasks first/i)).toBeTruthy();
    fireEvent.change(screen.getAllByLabelText("Status")[0], { target: { value: "in_progress" } });
    expect(onTaskStatus).toHaveBeenCalledWith("first", "in_progress");
  });
});
