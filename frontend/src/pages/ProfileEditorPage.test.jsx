import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, expect, test, vi } from "vitest";
import profileFixture from "../test/profileFixture.js";
import ProfileEditorPage from "./ProfileEditorPage.jsx";
import { updateSection } from "../services/profileApi.js";

const { setProfileMock } = vi.hoisted(() => ({ setProfileMock: vi.fn() }));

vi.mock("../context/StudentProfileContext.jsx", () => ({
  useStudentProfile: () => ({ error: "", isLoading: false, profile: profileFixture, refreshProfile: vi.fn(), setProfile: setProfileMock }),
}));
vi.mock("../context/AuthContext.jsx", () => ({
  useAuth: () => ({ logout: vi.fn(), user: { name: "Ada Lovelace", email: "ada@example.com", role: "student" } }),
}));
vi.mock("../services/profileApi.js", () => ({
  updateSection: vi.fn(),
  updatePersonal: vi.fn(),
  updatePreferences: vi.fn(),
  downloadPrivateFile: vi.fn(),
  parseResume: vi.fn(),
  removeProfilePhoto: vi.fn(),
  removeResume: vi.fn(),
  uploadProfilePhoto: vi.fn(),
  uploadResume: vi.fn(),
  importResumeSelection: vi.fn(),
}));

beforeEach(() => {
  setProfileMock.mockReset();
  updateSection.mockReset().mockResolvedValue({ profile: { ...profileFixture, skills: [{ name: "Research" }] } });
});

test("routes skill editing to the canonical Skill Intelligence experience", () => {
  render(<MemoryRouter initialEntries={["/profile/edit?section=skills"]}><ProfileEditorPage /></MemoryRouter>);
  expect(screen.getByRole("heading", { name: "Skills now live in Skill Intelligence." })).toBeTruthy();
  expect(screen.getByRole("link", { name: "Open Skill Intelligence" }).getAttribute("href")).toContain("/dashboard/skills");
  expect(screen.queryByLabelText("Skill name")).toBeNull();
});

test("warns before discarding unsaved section changes", () => {
  const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
  render(<MemoryRouter initialEntries={["/profile/edit?section=education"]}><ProfileEditorPage /></MemoryRouter>);
  fireEvent.click(screen.getByRole("button", { name: "+ Add education record" }));
  fireEvent.click(screen.getByRole("button", { name: /Personal information/ }));
  expect(confirm).toHaveBeenCalled();
  expect(screen.getByRole("heading", { name: "Education" })).toBeTruthy();
  confirm.mockRestore();
});
