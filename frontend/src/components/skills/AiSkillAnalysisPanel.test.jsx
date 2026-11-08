import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, test, vi } from "vitest";
import AiSkillAnalysisPanel from "./AiSkillAnalysisPanel.jsx";
import * as skillApi from "../../services/skillApi.js";

vi.mock("../../services/skillApi.js", () => ({
  generateAiSkillAnalysis: vi.fn(),
  getAiSkillAnalysis: vi.fn(),
  getSkillAiStatus: vi.fn(),
}));

const record = {
  id: "analysis-1",
  model: "gemini-test",
  generatedAt: "2026-11-07T10:00:00.000Z",
  cached: false,
  disclaimer: "Review AI guidance critically.",
  analysis: {
    summary: "Your SQL record is developing and needs stronger evidence.",
    strongestAreas: [],
    needsImprovement: [],
    insufficientEvidence: [{ title: "SQL evidence", explanation: "SQL is self-declared.", basis: ["SQL Fundamentals: self declared"], suggestedAction: "Attach an owned project." }],
    missingCompetencies: [], learningPriorities: [], strengthsToBuildUpon: [],
    nextSteps: ["Review the database project."], dataLimitations: [],
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  skillApi.getSkillAiStatus.mockResolvedValue({ available: true, model: "gemini-test" });
  skillApi.getAiSkillAnalysis.mockResolvedValue({ analysis: null });
  skillApi.generateAiSkillAnalysis.mockResolvedValue({ analysis: record });
});

test("generates an analysis only after an explicit student action", async () => {
  const user = userEvent.setup();
  render(<AiSkillAnalysisPanel />);
  expect(await screen.findByText(/No skill assessment generated yet/i)).toBeTruthy();
  expect(skillApi.generateAiSkillAnalysis).not.toHaveBeenCalled();
  await user.click(screen.getByRole("button", { name: "Generate skill insights" }));
  await waitFor(() => expect(skillApi.generateAiSkillAnalysis).toHaveBeenCalledWith({ forceRefresh: false, competencyRequirements: [] }));
  expect(await screen.findByText(/Your SQL record is developing/i)).toBeTruthy();
  expect(screen.getByText("SQL Fundamentals: self declared")).toBeTruthy();
});
