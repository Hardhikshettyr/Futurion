import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, test, vi } from "vitest";
import SkillGapCoachPanel from "./SkillGapCoachPanel.jsx";
import * as skillApi from "../../services/skillApi.js";

vi.mock("../../services/skillApi.js", () => ({ askSkillCoach: vi.fn(), getCoachConversation: vi.fn(), getCoachConversations: vi.fn(), getSkillAiStatus: vi.fn() }));

beforeEach(() => {
  vi.clearAllMocks();
  skillApi.getCoachConversations.mockResolvedValue({ items: [] });
  skillApi.getSkillAiStatus.mockResolvedValue({ available: true });
  skillApi.askSkillCoach.mockResolvedValue({ conversation: { id: "coach-1", title: "SQL gaps", messages: [
    { id: "m1", role: "user", content: "How can I demonstrate SQL?" },
    { id: "m2", role: "assistant", content: "Use your recorded database project.", knownFacts: [{ statement: "SQL is self-declared.", source: "StudentSkill" }], suggestions: [{ statement: "Attach query examples.", rationale: "They show applied work." }], unavailableInformation: [], followUpQuestions: [], model: "gemini-test" },
  ], updatedAt: new Date().toISOString() } });
});

test("sends a contextual question and separates facts from suggestions", async () => {
  const user = userEvent.setup();
  render(<SkillGapCoachPanel />);
  const input = await screen.findByLabelText("Ask the Skill Development Coach");
  await user.type(input, "How can I demonstrate SQL?");
  await user.click(screen.getByRole("button", { name: "Ask coach" }));
  await waitFor(() => expect(skillApi.askSkillCoach).toHaveBeenCalledWith({ conversationId: undefined, message: "How can I demonstrate SQL?" }));
  expect(await screen.findByText("Use your recorded database project.")).toBeTruthy();
  expect(screen.getByText("Suggestions")).toBeTruthy();
});
