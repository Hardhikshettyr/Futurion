import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";
import { librarySkill } from "../../test/skillFixture.js";
import RecommendationsPanel from "./RecommendationsPanel.jsx";
import * as skillApi from "../../services/skillApi.js";

vi.mock("../../services/skillApi.js", () => ({ addStudentSkill: vi.fn() }));

test("explains and accepts a recommendation without claiming proficiency", async () => {
  const user = userEvent.setup();
  skillApi.addStudentSkill.mockResolvedValue({ success: true });
  const onAdded = vi.fn().mockResolvedValue();
  render(<RecommendationsPanel isLoading={false} methodology="Curated relationship rules." onAdded={onAdded} items={[{
    skill: librarySkill,
    recommendationType: "missing_foundation",
    priority: "high",
    reason: "It is a curated prerequisite.",
    relevantExistingSkills: [],
    missingPrerequisites: [],
  }]} />);
  expect(screen.getByText("Curated relationship rules.")).toBeTruthy();
  await user.click(screen.getByRole("button", { name: "Add to learning list" }));
  await waitFor(() => expect(skillApi.addStudentSkill).toHaveBeenCalledWith(expect.objectContaining({
    skillId: librarySkill.id,
    proficiency: "beginner",
    learningStatus: "learning",
  })));
  expect(await screen.findByText(/added to your learning list at beginner proficiency/i)).toBeTruthy();
});
