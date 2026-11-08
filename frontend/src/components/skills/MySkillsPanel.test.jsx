import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, test, vi } from "vitest";
import { librarySkill, studentSkill } from "../../test/skillFixture.js";
import MySkillsPanel from "./MySkillsPanel.jsx";
import * as skillApi from "../../services/skillApi.js";

vi.mock("../../services/skillApi.js", () => ({
  addStudentSkill: vi.fn(),
  getSkillDependencies: vi.fn(),
  getSkillDetails: vi.fn(),
  getSkillLibrary: vi.fn(),
  getStudentSkills: vi.fn(),
  removeStudentSkill: vi.fn(),
  updateStudentSkill: vi.fn(),
  addSkillEvidence: vi.fn(),
  removeSkillEvidence: vi.fn(),
}));

vi.mock("../../context/StudentProfileContext.jsx", () => ({
  useStudentProfile: () => ({ profile: { projects: [], certifications: [], experience: [], education: [] } }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  skillApi.getStudentSkills.mockResolvedValue({
    items: [studentSkill],
    summary: { total: 1 },
    pagination: { page: 1, limit: 12, total: 1, totalPages: 1 },
  });
  skillApi.getSkillLibrary.mockResolvedValue({
    items: [{ ...librarySkill, id: "507f1f77bcf86cd799439099", name: "Research Methodology" }],
    pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
  });
  skillApi.getSkillDetails.mockResolvedValue({
    skill: { ...librarySkill, id: "507f1f77bcf86cd799439099", name: "Research Methodology" },
    prerequisites: [],
    relatedSkills: [],
  });
  skillApi.addStudentSkill.mockResolvedValue({ studentSkill });
  skillApi.removeStudentSkill.mockResolvedValue({ success: true });
  window.confirm = vi.fn(() => true);
});

test("searches, filters, and displays real student skill records", async () => {
  const user = userEvent.setup();
  render(<MySkillsPanel onMutation={vi.fn()} />);
  expect(await screen.findByRole("heading", { name: "Critical Thinking" })).toBeTruthy();
  await user.type(screen.getByPlaceholderText("Search my skills"), "critical");
  await waitFor(() => expect(skillApi.getStudentSkills).toHaveBeenLastCalledWith(expect.objectContaining({ q: "critical" })));
  expect(screen.getAllByText("Currently Learning").length).toBeGreaterThan(0);
});

test("adds a selected canonical skill without creating a free-text identity", async () => {
  const user = userEvent.setup();
  const onMutation = vi.fn().mockResolvedValue();
  render(<MySkillsPanel onMutation={onMutation} />);
  await screen.findByText("Critical Thinking");
  await user.click(screen.getByRole("button", { name: "+ Add skill" }));
  const candidate = await screen.findByRole("button", { name: /Research Methodology/ });
  await user.click(candidate);
  await user.click(screen.getByRole("button", { name: "Add to my skills" }));
  await waitFor(() => expect(skillApi.addStudentSkill).toHaveBeenCalledWith(expect.objectContaining({
    skillId: "507f1f77bcf86cd799439099",
    proficiency: "beginner",
    learningStatus: "learning",
  })));
});

test("removes the authenticated student's skill after confirmation", async () => {
  const user = userEvent.setup();
  render(<MySkillsPanel onMutation={vi.fn()} />);
  await screen.findByText("Critical Thinking");
  await user.click(screen.getByRole("button", { name: "Remove" }));
  expect(window.confirm).toHaveBeenCalled();
  await waitFor(() => expect(skillApi.removeStudentSkill).toHaveBeenCalledWith(studentSkill.id));
});

test("shows backend loading failures with a retry action", async () => {
  skillApi.getStudentSkills.mockRejectedValueOnce(new Error("Skills could not be loaded"));
  render(<MySkillsPanel onMutation={vi.fn()} />);
  expect((await screen.findByRole("alert")).textContent).toContain("Skills could not be loaded");
  expect(screen.getByRole("button", { name: "Try again" })).toBeTruthy();
});

test("shows a loading state while skill records are pending", async () => {
  let resolveRequest;
  skillApi.getStudentSkills.mockReturnValueOnce(new Promise((resolve) => { resolveRequest = resolve; }));
  render(<MySkillsPanel onMutation={vi.fn()} />);
  expect(await screen.findByText("Loading your skill records…")).toBeTruthy();
  await act(async () => {
    resolveRequest({ items: [], summary: { total: 0 }, pagination: { page: 1, limit: 12, total: 0, totalPages: 1 } });
  });
});
