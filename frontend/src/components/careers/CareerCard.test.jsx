import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { expect, test, vi } from "vitest";
import CareerCard from "./CareerCard.jsx";

const career = {
  id: "507f1f77bcf86cd799439012",
  title: "UX Researcher",
  categoryLabel: "Design and Creative Industries",
  industry: "Design research",
  shortDescription: "Studies user needs and turns evidence into product guidance.",
  essentialSkills: [{ skill: { id: "507f1f77bcf86cd799439013", name: "Research Methodology" } }],
};

test("renders real career details, transparent fit and a working detail link", () => {
  render(<MemoryRouter><CareerCard career={career} fit={{ score: 74, recommendationReasons: ["skills: Research methodology aligns."] }} /></MemoryRouter>);
  expect(screen.getByRole("heading", { name: "UX Researcher" })).toBeTruthy();
  expect(screen.getByText("74%")).toBeTruthy();
  expect(screen.getByText("Research Methodology")).toBeTruthy();
  expect(screen.getByRole("link", { name: "Explore career" }).getAttribute("href")).toBe(`/dashboard/careers/${career.id}`);
});

test("supports save and comparison selection controls", async () => {
  const user = userEvent.setup();
  const onSave = vi.fn();
  const onCompare = vi.fn();
  render(<MemoryRouter><CareerCard career={career} compact saved selectedForComparison={false} onSave={onSave} onCompare={onCompare} /></MemoryRouter>);
  await user.click(screen.getByRole("button", { name: "Saved ✓" }));
  await user.click(screen.getByRole("checkbox", { name: "Select for comparison" }));
  expect(onSave).toHaveBeenCalledWith(career, true);
  expect(onCompare).toHaveBeenCalledWith(career, true);
});
