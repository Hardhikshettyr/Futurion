import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import LearningProgressPanel from "./LearningProgressPanel.jsx";

describe("LearningProgressPanel", () => {
  it("shows database counts without inventing a completion percentage", () => {
    render(<LearningProgressPanel progress={{
      summary: { totalSaved: 4, inLearningLibrary: 3, inProgress: 1, completed: 1 },
      bySkill: [{ skill: { id: "skill-1", name: "Python" }, resources: 2, inProgress: 1, completed: 1 }],
      recentActivities: [], methodology: "Progress reports saved records and current statuses only.",
    }} />);
    expect(screen.getByText("Python")).toBeTruthy();
    expect(screen.getByText("2 saved resources")).toBeTruthy();
    expect(screen.queryByText(/%/)).toBeNull();
    expect(screen.getByText(/current statuses only/i)).toBeTruthy();
  });
});
