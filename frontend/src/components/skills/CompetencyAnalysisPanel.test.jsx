import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, test, vi } from "vitest";
import { librarySkill } from "../../test/skillFixture.js";
import CompetencyAnalysisPanel from "./CompetencyAnalysisPanel.jsx";
import * as skillApi from "../../services/skillApi.js";

vi.mock("../../services/skillApi.js", () => ({
  getSkillLibrary: vi.fn(),
  runCompetencyAnalysis: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
  skillApi.getSkillLibrary.mockResolvedValue({ items: [librarySkill] });
  skillApi.runCompetencyAnalysis.mockResolvedValue({
    summary: {
      proficiencyCoverage: 50,
      missingSkills: 0,
      belowRequiredProficiency: 1,
      meetingRequiredProficiency: 0,
      insufficientEvidence: 1,
      incompletePrerequisites: 0,
      calculation: "Current level divided by the required level, averaged.",
      disclaimer: "This is not a hiring probability.",
    },
    requirements: [{
      skill: librarySkill,
      requiredProficiency: "intermediate",
      currentProficiency: "beginner",
      proficiencyGap: 1,
      missing: false,
      belowRequired: true,
      meetsProficiency: false,
      insufficientEvidence: true,
      prerequisitesMissing: false,
      recommendedNextAction: "Continue practicing and collect evidence.",
    }],
  });
});

test("selects required skills and explains competency gaps", async () => {
  const user = userEvent.setup();
  render(<CompetencyAnalysisPanel />);
  await user.type(screen.getByLabelText("Find a required skill"), "critical");
  await user.click(await screen.findByRole("button", { name: /Critical Thinking/ }));
  await user.click(screen.getByRole("button", { name: "Run competency analysis" }));
  await waitFor(() => expect(skillApi.runCompetencyAnalysis).toHaveBeenCalledWith([{ skillId: librarySkill.id, requiredProficiency: "intermediate" }]));
  expect(await screen.findByText("50%")).toBeTruthy();
  expect(screen.getByText("Evidence information needed")).toBeTruthy();
  expect(screen.getByText("This is not a hiring probability.")).toBeTruthy();
});
