import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, test, vi } from "vitest";
import SkillAssessmentPanel from "./SkillAssessmentPanel.jsx";
import * as skillApi from "../../services/skillApi.js";

vi.mock("../../services/skillApi.js", () => ({ generateSkillAssessment: vi.fn(), getSkillAiStatus: vi.fn(), getSkillAssessment: vi.fn(), getSkillAssessments: vi.fn(), getSkillLibrary: vi.fn(), submitSkillAssessment: vi.fn() }));

const generated = { id: "assessment-1", skill: { id: "skill-1", name: "SQL Fundamentals" }, proficiencyLevel: "beginner", title: "SQL check", instructions: ["Choose one answer."], status: "generated", model: "gemini-test", disclaimer: "AI assessment", questions: [{ id: "q1", type: "multiple_choice", prompt: "Which command reads rows?", options: [{ id: "a", text: "SELECT" }, { id: "b", text: "DROP" }], maxPoints: 2 }] };

beforeEach(() => {
  vi.clearAllMocks();
  skillApi.getSkillLibrary.mockResolvedValue({ items: [{ id: "skill-1", name: "SQL Fundamentals" }] });
  skillApi.getSkillAssessments.mockResolvedValue({ items: [] });
  skillApi.getSkillAiStatus.mockResolvedValue({ available: true });
  skillApi.generateSkillAssessment.mockResolvedValue({ assessment: generated });
  skillApi.submitSkillAssessment.mockResolvedValue({ assessment: { ...generated, status: "submitted", score: 2, maxScore: 2, percentage: 100, submittedAt: new Date().toISOString(), answers: [{ questionId: "q1", answer: "a", score: 2, maxPoints: 2, correct: true, feedback: "Correct", areasToImprove: [] }], questions: [{ ...generated.questions[0], explanation: "SELECT reads rows.", referenceAnswer: "SELECT", rubric: [] }] } });
});

test("generates, attempts, and submits an assessment without changing proficiency", async () => {
  const user = userEvent.setup();
  render(<SkillAssessmentPanel />);
  await user.selectOptions(await screen.findByLabelText("Skill"), "skill-1");
  await user.click(screen.getByRole("button", { name: "Generate assessment" }));
  expect(await screen.findByText("Which command reads rows?")).toBeTruthy();
  await user.click(screen.getByLabelText("SELECT"));
  await user.click(screen.getByRole("button", { name: "Submit assessment" }));
  await waitFor(() => expect(skillApi.submitSkillAssessment).toHaveBeenCalledWith("assessment-1", [{ questionId: "q1", answer: "a" }]));
  expect(await screen.findByText("100%")).toBeTruthy();
  expect(screen.getByText(/Results stay separate from proficiency/i)).toBeTruthy();
});
