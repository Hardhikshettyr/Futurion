import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";
import profileFixture from "../../test/profileFixture.js";
import ResumeManager from "./ResumeManager.jsx";
import {
  importResumeSelection,
  parseResume,
  uploadResume,
} from "../../services/profileApi.js";

const { setProfileMock } = vi.hoisted(() => ({ setProfileMock: vi.fn() }));
let currentProfile;

vi.mock("../../context/StudentProfileContext.jsx", () => ({
  useStudentProfile: () => ({ profile: currentProfile, setProfile: setProfileMock }),
}));
vi.mock("../../services/profileApi.js", () => ({
  downloadPrivateFile: vi.fn(),
  importResumeSelection: vi.fn(),
  parseResume: vi.fn(),
  removeResume: vi.fn(),
  uploadResume: vi.fn(),
}));

const extraction = {
  personal: { fullName: "Ada Lovelace", phone: null, city: null, country: null, headline: null, summary: null, linkedInUrl: null, githubUrl: null, portfolioUrl: null },
  education: [],
  skills: [{ name: "Research", category: "transferable", proficiency: "advanced", description: "Research projects" }],
  projects: [], experience: [], certifications: [], warnings: ["Dates were incomplete."],
};

beforeEach(() => {
  setProfileMock.mockReset();
  currentProfile = {
    ...profileFixture,
    skills: [{ id: "skill-1", name: "Research" }],
    resume: { filename: "futurion-resume.pdf", mimeType: "application/pdf", size: 1200, uploadedAt: "2026-11-07T10:00:00.000Z" },
    capabilities: { resumeParsingAvailable: true },
  };
  parseResume.mockReset().mockResolvedValue({ extraction });
  importResumeSelection.mockReset().mockResolvedValue({ profile: currentProfile, imported: { personal: 1, skills: 1, education: 0, projects: 0, experience: 0, certifications: 0 } });
  uploadResume.mockReset().mockResolvedValue({ profile: currentProfile, message: "Resume uploaded securely" });
});

test("shows extraction conflicts and saves only after explicit confirmation", async () => {
  render(<ResumeManager />);
  fireEvent.click(screen.getByRole("button", { name: "Review extracted information" }));
  expect(await screen.findByText("Review before anything is saved.")).toBeTruthy();
  expect(screen.getByText("Matches an existing record")).toBeTruthy();
  expect(importResumeSelection).not.toHaveBeenCalled();

  fireEvent.click(screen.getByRole("button", { name: "Confirm selected changes" }));
  await waitFor(() => expect(importResumeSelection).toHaveBeenCalledWith(expect.objectContaining({ skills: expect.any(Array) }), expect.objectContaining({ skills: [0] })));
  expect(setProfileMock).toHaveBeenCalled();
});

test("uploads a validated PDF with progress-aware API integration", async () => {
  currentProfile = { ...profileFixture, resume: null, capabilities: { resumeParsingAvailable: false } };
  const { container } = render(<ResumeManager />);
  const input = container.querySelector('input[type="file"]');
  const file = new File(["%PDF-1.7"], "resume.pdf", { type: "application/pdf" });
  fireEvent.change(input, { target: { files: [file] } });
  await waitFor(() => expect(uploadResume).toHaveBeenCalledWith(file, expect.any(Function)));
});
