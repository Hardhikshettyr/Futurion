import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import ProgressMetricGrid from "./ProgressMetricGrid.jsx";

test("renders only factual counts and task-based roadmap completion", () => {
  render(<ProgressMetricGrid metrics={{ skillsDeveloped: 5, skillsWithEvidence: 2, projects: 3, certifications: 1, completedLearningResources: 4, opportunitiesTracked: 2, roadmapCompletion: { percentage: 40, completedTasks: 2, totalTasks: 5 } }} />);
  expect(screen.getByText("Skills developed")).toBeTruthy();
  expect(screen.getByText("Evidence-supported skills")).toBeTruthy();
  expect(screen.getByText("40%")).toBeTruthy();
  expect(screen.getByText("2 of 5 active tasks completed")).toBeTruthy();
  expect(screen.queryByText(/readiness score/i)).toBeNull();
});
