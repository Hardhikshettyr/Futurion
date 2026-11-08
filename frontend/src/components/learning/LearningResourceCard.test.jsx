import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import LearningResourceCard from "./LearningResourceCard.jsx";

const resource = {
  id: "resource-1", title: "Official Python Tutorial", description: "Learn Python from the official documentation.",
  resourceType: "documentation", provider: "Python Software Foundation", difficulty: "beginner",
  priceType: "free", priceAmount: 0, currency: "", duration: "Self-paced", certificateAvailable: false,
  skillsCovered: [{ id: "skill-1", name: "Python" }], studentState: { bookmarked: false, inLearningLibrary: false },
};

describe("LearningResourceCard", () => {
  it("renders actual resource facts and exposes bookmark, library and AI-selection actions", () => {
    const onSave = vi.fn(); const onToggleCompare = vi.fn();
    render(<MemoryRouter><LearningResourceCard resource={resource} onSave={onSave} onToggleCompare={onToggleCompare} /></MemoryRouter>);
    expect(screen.getByRole("heading", { name: "Official Python Tutorial" })).toBeTruthy();
    expect(screen.getByText("Python Software Foundation")).toBeTruthy();
    expect(screen.getByText("Free")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Bookmark" }));
    expect(onSave).toHaveBeenCalledWith("resource-1", "bookmark");
    fireEvent.click(screen.getByLabelText("Select for learning guidance"));
    expect(onToggleCompare).toHaveBeenCalledWith("resource-1");
  });
});
