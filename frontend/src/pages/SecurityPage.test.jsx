import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, expect, test, vi } from "vitest";
import SecurityPage from "./SecurityPage.jsx";
import {
  changePassword,
  getSessions,
  revokeSession,
} from "../services/authApi.js";

const { setUserMock } = vi.hoisted(() => ({ setUserMock: vi.fn() }));

vi.mock("../context/AuthContext.jsx", () => ({
  useAuth: () => ({
    logout: vi.fn(),
    setUser: setUserMock,
    user: { name: "Ada Lovelace", email: "ada@example.com", role: "student" },
  }),
}));

vi.mock("../services/authApi.js", () => ({
  changePassword: vi.fn(),
  getSessions: vi.fn(),
  logoutAllDevices: vi.fn(),
  revokeSession: vi.fn(),
}));

const sessions = [
  {
    id: "session-1",
    device: "Google Chrome",
    userAgent: "Chrome test agent",
    createdAt: "2026-11-07T10:00:00.000Z",
    lastUsedAt: "2026-11-07T10:10:00.000Z",
    current: true,
  },
  {
    id: "session-2",
    device: "Safari on iOS",
    userAgent: "iPhone test agent",
    createdAt: "2026-11-06T10:00:00.000Z",
    lastUsedAt: "2026-11-06T10:10:00.000Z",
    current: false,
  },
];

beforeEach(() => {
  getSessions.mockReset().mockResolvedValue({ sessions });
  revokeSession.mockReset().mockResolvedValue({ currentSessionRevoked: false });
  changePassword.mockReset().mockResolvedValue({
    authenticated: true,
    message: "Password changed. Other sessions were signed out.",
  });
});

test("lists and revokes an owned session", async () => {
  render(<MemoryRouter><SecurityPage /></MemoryRouter>);
  expect(await screen.findByText("Safari on iOS")).toBeTruthy();
  const revokeButtons = screen.getAllByRole("button", { name: "Revoke" });
  fireEvent.click(revokeButtons[1]);
  await waitFor(() => expect(revokeSession).toHaveBeenCalledWith("session-2"));
});

test("changes the password and reports success", async () => {
  render(<MemoryRouter><SecurityPage /></MemoryRouter>);
  await screen.findByText("Google Chrome");
  fireEvent.change(screen.getByLabelText("Current password"), {
    target: { value: "OldPassword123!" },
  });
  fireEvent.change(screen.getByLabelText("New password"), {
    target: { value: "NewPassword123!" },
  });
  fireEvent.change(screen.getByLabelText("Confirm new password"), {
    target: { value: "NewPassword123!" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Update password" }));

  expect(
    await screen.findByText("Password changed. Other sessions were signed out."),
  ).toBeTruthy();
});
