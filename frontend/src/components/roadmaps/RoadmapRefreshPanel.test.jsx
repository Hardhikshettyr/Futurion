import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import RoadmapRefreshPanel from "./RoadmapRefreshPanel.jsx";

describe("RoadmapRefreshPanel", () => {
  it("requires an explicit confirmation after showing changes", () => {
    const onConfirm = vi.fn();
    render(<RoadmapRefreshPanel loading={false} onGenerate={vi.fn()} onConfirm={onConfirm} proposal={{ additions: [{ stableKey: "new", title: "New skill task", stageKey: "core_skills", estimatedHours: 8 }], removals: [], changes: [], unchangedCount: 2, completedTasksProtected: 1 }} />);
    expect(screen.getByText("New skill task")).toBeTruthy();
    expect(screen.getByText(/1 completed task protected/i)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /confirm refresh/i }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
