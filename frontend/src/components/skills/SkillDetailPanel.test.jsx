import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, test, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import profileFixture from "../../test/profileFixture.js";
import { dependencyFixture, studentSkill } from "../../test/skillFixture.js";
import SkillDetailPanel from "./SkillDetailPanel.jsx";
import * as skillApi from "../../services/skillApi.js";

vi.mock("../../services/skillApi.js", () => ({
  addSkillEvidence: vi.fn(),
  getSkillDependencies: vi.fn(),
  removeSkillEvidence: vi.fn(),
  updateStudentSkill: vi.fn(),
}));
vi.mock("../../context/StudentProfileContext.jsx", () => ({
  useStudentProfile: () => ({ profile: { ...profileFixture, projects: [{ id: "507f1f77bcf86cd799439088", title: "Evidence project" }] } }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  skillApi.getSkillDependencies.mockResolvedValue(dependencyFixture);
  skillApi.updateStudentSkill.mockResolvedValue({ studentSkill: { ...studentSkill, proficiency: "intermediate" } });
  skillApi.addSkillEvidence.mockResolvedValue({ studentSkill: { ...studentSkill, evidenceStatus: "demonstrated", evidenceCount: 1, evidence: [{ id: "507f1f77bcf86cd799439077", evidenceType: "project", description: "Evidence project", externalUrl: "" }] } });
  skillApi.removeSkillEvidence.mockResolvedValue({ studentSkill });
});

function renderPanel(props) {
  return render(<MemoryRouter><SkillDetailPanel {...props} /></MemoryRouter>);
}

test("removes an owned evidence record after confirmation", async () => {
  const user = userEvent.setup();
  window.confirm = vi.fn(() => true);
  const withEvidence = {
    ...studentSkill,
    evidenceCount: 1,
    evidence: [{ id: "507f1f77bcf86cd799439077", evidenceType: "project", description: "Evidence project", externalUrl: "" }],
  };
  renderPanel({ initialRecord: withEvidence, onChanged: vi.fn(), onClose: vi.fn() });
  await user.click(screen.getByRole("tab", { name: "Evidence" }));
  await user.click(screen.getByRole("button", { name: "Remove" }));
  await waitFor(() => expect(skillApi.removeSkillEvidence).toHaveBeenCalledWith(withEvidence.id, "507f1f77bcf86cd799439077"));
});

test("updates proficiency without exposing verified as a student control", async () => {
  const user = userEvent.setup();
  renderPanel({ initialRecord: studentSkill, onChanged: vi.fn(), onClose: vi.fn() });
  await user.selectOptions(screen.getByLabelText("Proficiency"), "intermediate");
  await user.click(screen.getByRole("button", { name: "Save progress" }));
  await waitFor(() => expect(skillApi.updateStudentSkill).toHaveBeenCalledWith(studentSkill.id, expect.objectContaining({ proficiency: "intermediate" })));
  expect(screen.queryByRole("option", { name: "Verified" })).toBeNull();
});

test("connects owned project evidence and displays dependency relationships", async () => {
  const user = userEvent.setup();
  renderPanel({ initialRecord: studentSkill, onChanged: vi.fn(), onClose: vi.fn() });
  await user.click(screen.getByRole("tab", { name: "Evidence" }));
  await user.selectOptions(screen.getByLabelText("Owned profile record"), "507f1f77bcf86cd799439088");
  await user.type(screen.getByLabelText("Description"), "Built and presented this project");
  await user.click(screen.getByRole("button", { name: "Connect evidence" }));
  await waitFor(() => expect(skillApi.addSkillEvidence).toHaveBeenCalledWith(studentSkill.id, expect.objectContaining({ evidenceType: "project", referenceId: "507f1f77bcf86cd799439088" })));
  await user.click(screen.getByRole("tab", { name: "Dependencies" }));
  expect(await screen.findByText("Accessible relationship list")).toBeTruthy();
  expect(screen.getByText(/Direct prerequisites: None recorded/)).toBeTruthy();
});
