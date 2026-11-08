import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";
import CareerComparisonGrid from "./CareerComparisonGrid.jsx";

function item(id, title, score = 70) {
  return {
    career: { id, title, categoryLabel: "Education and Research", industry: "Research", overview: `${title} overview`, responsibilities: ["Interpret evidence"], workEnvironments: ["Research team"], workModes: ["hybrid"], employmentTypes: ["full_time"], acceptedDisciplines: [], requiredEducation: [], requiredCertifications: [], recommendedCertifications: [], careerProgression: [] },
    alignment: { score, confidence: score === null ? "low" : "medium", availableWeight: score === null ? 0 : 70, contributions: [{ factor: "skills", rawScore: score }], matchingSkills: [], missingSkills: [], skillsRequiringImprovement: [], educationAlignment: { explanation: "Education information is incomplete." }, crossDisciplinePathways: [] },
    preparation: { missingPrerequisites: [], evidenceGaps: [], priorities: [], missingFoundations: [], missingAdvancedCompetencies: [], learningResources: [] },
    certifications: { required: [], recommended: [], relevantHeld: [], explanation: "Optional certifications remain optional." },
    application: { portfolioGaps: [], suggestedProjectAreas: [] },
    strengths: ["Recorded evidence can be inspected."], tradeoffs: ["Requirements vary."],
  };
}

test("renders side-by-side careers and removes only the requested column", async () => {
  const user = userEvent.setup();
  const onRemove = vi.fn();
  render(<CareerComparisonGrid careers={[item("c1", "UX Researcher"), item("c2", "Data Analyst")]} tab="overview" onRemove={onRemove} />);
  expect(screen.getByRole("heading", { name: "UX Researcher" })).toBeTruthy();
  expect(screen.getByRole("heading", { name: "Data Analyst" })).toBeTruthy();
  await user.click(screen.getByRole("button", { name: "Remove UX Researcher" }));
  expect(onRemove).toHaveBeenCalledWith("c1");
});

test("shows missing score information as unknown instead of zero", () => {
  render(<CareerComparisonGrid careers={[item("c1", "Uncertain Path", null), item("c2", "Known Path")]} tab="skills" onRemove={vi.fn()} />);
  expect(screen.getByText("unknown")).toBeTruthy();
  expect(screen.getAllByText("Unknown").length).toBeGreaterThan(0);
});
