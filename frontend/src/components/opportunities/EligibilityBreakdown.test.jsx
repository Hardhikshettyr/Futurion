import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import EligibilityBreakdown from "./EligibilityBreakdown.jsx";

test("shows unknown separately from unmet and explains deterministic coverage", () => {
  render(<EligibilityBreakdown eligibility={{
    overall: "insufficient_information", overallLabel: "Insufficient Information",
    disclaimer: "This deterministic comparison does not verify official eligibility.",
    summary: { mandatoryCoverage: 50, met: 1, partiallyMet: 0, notMet: 1, unknown: 1 },
    requirements: [
      { key: "skill:1", category: "skill", importance: "mandatory", title: "Python", requirement: "Intermediate", status: "unknown", statusLabel: "Unknown / Not Provided", explanation: "Python is not recorded.", evidence: [] },
      { key: "education:1", category: "education", importance: "preferred", title: "Education", requirement: "Postgraduate study", status: "not_met", statusLabel: "Not Met", explanation: "Recorded education does not match.", evidence: ["Secondary school"] },
    ],
  }} />);
  expect(screen.getByRole("heading", { name: "Insufficient Information" })).toBeTruthy();
  expect(screen.getByText("Unknown / Not Provided")).toBeTruthy();
  expect(screen.getByText("Not Met")).toBeTruthy();
  expect(screen.getByText("50%")).toBeTruthy();
});
