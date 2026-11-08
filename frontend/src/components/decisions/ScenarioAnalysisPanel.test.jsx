import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import ScenarioAnalysisPanel from "./ScenarioAnalysisPanel.jsx";

const analysis = {
  targetCareer: { title: "UX Researcher", industry: "Design research", categoryLabel: "Design and Creative Industries" },
  actualBaseline: { alignment: { score: 42, availableWeight: 70 }, application: { relevantExperience: [], relevantProjects: [] } },
  simulated: {
    alignment: { score: 61, availableWeight: 70, contributions: [{ factor: "skills", rawScore: 65 }], educationAlignment: { explanation: "A psychology pathway aligns." } },
    preparation: { priorities: ["Build research evidence."], evidenceGaps: [] },
    application: { suggestedProjectAreas: [{ suggestion: "Run a scoped interview study." }] },
    career: { requiredEducation: [{ pathwayType: "common", qualification: "Relevant undergraduate study" }] },
  },
  differences: {
    alignmentScoreChange: 19,
    hypotheticalInputs: [{ skill: { name: "User Research" }, actualProficiency: "beginner", proficiency: "intermediate", source: "hypothetical_override" }],
    hypotheticalQualifications: [], newlyAlignedSkills: [{ skill: { name: "User Research" }, currentProficiency: "intermediate" }], remainingSkillGaps: [],
  },
  learningContext: { weeklyLearningHours: 5, learningPreferences: ["project_based"], targetDate: null, statement: "No guaranteed completion date is calculated." },
  disclaimer: "Hypothetical values exist only inside this scenario.",
};

test("visually separates actual baseline from hypothetical scenario changes", () => {
  render(<ScenarioAnalysisPanel analysis={analysis} />);
  expect(screen.getByText("Actual profile")).toBeTruthy();
  expect(screen.getByText("Scenario-only view")).toBeTruthy();
  expect(screen.getByText(/beginner → intermediate/)).toBeTruthy();
  expect(screen.getByText(/Hypothetical values exist only/)).toBeTruthy();
  expect(screen.getByText(/No guaranteed completion date/)).toBeTruthy();
});
