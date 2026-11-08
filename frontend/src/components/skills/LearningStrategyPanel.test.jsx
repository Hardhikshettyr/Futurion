import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, test, vi } from "vitest";
import LearningStrategyPanel from "./LearningStrategyPanel.jsx";
import * as skillApi from "../../services/skillApi.js";

vi.mock("../../services/skillApi.js", () => ({
  generateLearningStrategy: vi.fn(), getLearningStrategies: vi.fn(), getSkillAiStatus: vi.fn(), getSkillLibrary: vi.fn(), updateLearningStrategy: vi.fn(),
}));

const strategy = {
  id: "strategy-1", targetSkill: { id: "skill-1", name: "SQL Fundamentals" }, currentProficiency: "beginner", requiredProficiency: "intermediate", preferredLearningTime: "", status: "draft", studentNotes: "", model: "gemini-test", disclaimer: "AI guidance", strategy: {
    title: "Build practical SQL", learningObjective: "Develop intermediate query skills.",
    prerequisites: [{ skillId: "skill-2", skillName: "Database Fundamentals", source: "skill_library", status: "missing", reason: "Curated prerequisite." }],
    stages: [{ order: 1, title: "Query foundations", objective: "Write reliable queries.", topics: ["SELECT"], practicalExercises: ["Query a sample dataset."], completionCriteria: ["Explain each clause."] }],
    suggestedProjects: ["Build a small data report."], resourceRecommendations: [], howToDemonstrate: ["Attach an owned project."], completionCriteria: ["Complete the query exercise."], assumptions: [],
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  skillApi.getSkillLibrary.mockResolvedValue({ items: [{ id: "skill-1", name: "SQL Fundamentals", description: "Query data." }] });
  skillApi.getLearningStrategies.mockResolvedValue({ items: [] });
  skillApi.getSkillAiStatus.mockResolvedValue({ available: true });
  skillApi.generateLearningStrategy.mockResolvedValue({ learningStrategy: strategy });
  skillApi.updateLearningStrategy.mockResolvedValue({ learningStrategy: { ...strategy, status: "saved" } });
});

test("generates, displays, and explicitly saves a grounded learning strategy", async () => {
  const user = userEvent.setup();
  render(<LearningStrategyPanel />);
  await user.selectOptions(await screen.findByLabelText("Target skill"), "skill-1");
  await user.click(screen.getByRole("button", { name: "Generate draft" }));
  expect(await screen.findByText("Build practical SQL")).toBeTruthy();
  expect(screen.getByText("Recorded Skill Library relationship")).toBeTruthy();
  expect(screen.getByText(/no linked resources available/i)).toBeTruthy();
  await user.click(screen.getByRole("button", { name: "Approve and save" }));
  await waitFor(() => expect(skillApi.updateLearningStrategy).toHaveBeenCalledWith("strategy-1", { status: "saved", studentNotes: "" }));
});
