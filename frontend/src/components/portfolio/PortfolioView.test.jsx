import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import PortfolioView from "./PortfolioView.jsx";

test("renders only sections contained in the backend public projection", () => {
  render(<PortfolioView portfolio={{ name: "Jane Student", sections: { about: { headline: "Developer", summary: "Builds accessible products.", location: "India" }, skills: [{ id: "1", name: "React", category: "technical", proficiency: "intermediate", evidenceStatus: "demonstrated", supportingEvidenceCount: 1 }] } }} />);
  expect(screen.getByRole("heading", { name: "Jane Student" })).toBeTruthy();
  expect(screen.getByRole("heading", { name: "About Me" })).toBeTruthy();
  expect(screen.getByRole("heading", { name: "Skills" })).toBeTruthy();
  expect(screen.queryByRole("heading", { name: "Projects" })).toBeNull();
  expect(screen.queryByText(/application/i)).toBeNull();
});
