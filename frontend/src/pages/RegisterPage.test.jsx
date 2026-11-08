import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, test, vi } from "vitest";
import RegisterPage from "./RegisterPage.jsx";
import { registerStudent } from "../services/authApi.js";

vi.mock("../services/authApi.js", () => ({
  registerStudent: vi.fn(),
}));

function renderRegistration() {
  return render(
    <MemoryRouter initialEntries={["/register"]}>
      <Routes>
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/verify-email" element={<div>Email verification screen</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

function fillValidRegistration() {
  fireEvent.change(screen.getByLabelText("Full name"), {
    target: { value: "Ada Lovelace" },
  });
  fireEvent.change(screen.getByLabelText("Email address"), {
    target: { value: "ada@example.com" },
  });
  fireEvent.change(screen.getByLabelText("Password"), {
    target: { value: "SecurePassword123!" },
  });
  fireEvent.change(screen.getByLabelText("Confirm password"), {
    target: { value: "SecurePassword123!" },
  });
}

beforeEach(() => {
  registerStudent.mockReset();
});

describe("RegisterPage", () => {
  test("shows client-side validation before submitting", () => {
    renderRegistration();
    fireEvent.click(screen.getByRole("button", { name: /create student account/i }));

    expect(screen.getByText("Enter your full name")).toBeTruthy();
    expect(screen.getByText("Enter a valid email address")).toBeTruthy();
    expect(registerStudent).not.toHaveBeenCalled();
  });

  test("shows a loading state and navigates after registration", async () => {
    let resolveRequest;
    registerStudent.mockReturnValue(
      new Promise((resolve) => {
        resolveRequest = resolve;
      }),
    );
    renderRegistration();
    fillValidRegistration();

    fireEvent.click(screen.getByRole("button", { name: /create student account/i }));
    expect(screen.getByRole("button", { name: /creating your account/i }).disabled).toBe(true);

    resolveRequest({
      user: { email: "ada@example.com" },
      verification: { emailSent: true, resendCooldownSeconds: 60 },
    });

    expect(await screen.findByText("Email verification screen")).toBeTruthy();
  });

  test("shows a safe server error", async () => {
    registerStudent.mockRejectedValue(new Error("Registration is temporarily unavailable"));
    renderRegistration();
    fillValidRegistration();
    fireEvent.click(screen.getByRole("button", { name: /create student account/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert").textContent).toContain(
        "Registration is temporarily unavailable",
      );
    });
  });
});
