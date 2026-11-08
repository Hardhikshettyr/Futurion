import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import RoadmapProgress from "./RoadmapProgress.jsx";

describe("RoadmapProgress", () => {
  it("shows backend-calculated task completion and labels time as an estimate", () => {
    render(<RoadmapProgress progress={{ completionPercentage: 50, completedTasks: 2, totalTasks: 4, inProgressTasks: 1, remainingTasks: 1, remainingHours: 12, estimatedWeeksRemaining: 2.4, estimateNote: "This is a planning estimate, not a completion guarantee." }} />);
    expect(screen.getAllByText("50%").length).toBeGreaterThan(0);
    expect(screen.getByText("2 of 4 tasks completed")).toBeTruthy();
    expect(screen.getByText(/not a completion guarantee/i)).toBeTruthy();
  });
});
