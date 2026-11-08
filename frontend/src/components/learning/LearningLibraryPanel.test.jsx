import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import LearningLibraryPanel from "./LearningLibraryPanel.jsx";

describe("LearningLibraryPanel", () => {
  it("updates resource status without claiming the covered skill is verified", () => {
    const onUpdate = vi.fn();
    render(<MemoryRouter><LearningLibraryPanel scope="all" onScope={vi.fn()} onUpdate={onUpdate} onRemove={vi.fn()} loading={false} items={[{
      id: "item-1", status: "not_started", bookmarked: true, inLearningLibrary: true,
      resource: { id: "resource-1", title: "Python Tutorial", resourceType: "documentation", provider: "PSF", skillsCovered: [{ id: "skill-1", name: "Python" }] },
    }]} /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText("Status"), { target: { value: "completed" } });
    expect(onUpdate).toHaveBeenCalledWith("item-1", { status: "completed" });
    expect(screen.getByText(/completion does not verify a skill/i)).toBeTruthy();
  });
});
