import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { expect, test } from "vitest";
import ActivityTimeline from "./ActivityTimeline.jsx";

test("renders dated activity with a link to its source module", () => {
  render(<MemoryRouter><ActivityTimeline items={[{ id: "evidence:1", type: "evidence_added", title: "Evidence added for React", description: "Project evidence recorded.", date: "2026-10-02T10:00:00.000Z", module: "skills", href: "/dashboard/skills" }]} /></MemoryRouter>);
  expect(screen.getByRole("heading", { name: "Evidence added for React" })).toBeTruthy();
  expect(screen.getByRole("link", { name: /Open source record/ }).getAttribute("href")).toBe("/dashboard/skills");
  expect(screen.getByText("1 events")).toBeTruthy();
});
