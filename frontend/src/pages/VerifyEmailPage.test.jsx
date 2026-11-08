import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, test, vi } from "vitest";
import VerifyEmailPage from "./VerifyEmailPage.jsx";
import {
  resendVerificationEmail,
  verifyStudentEmail,
} from "../services/authApi.js";

vi.mock("../services/authApi.js", () => ({
  resendVerificationEmail: vi.fn(),
  verifyStudentEmail: vi.fn(),
}));

function renderVerification() {
  return render(
    <MemoryRouter
      initialEntries={[
        { pathname: "/verify-email", state: { email: "ada@example.com" } },
      ]}
    >
      <VerifyEmailPage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  resendVerificationEmail.mockReset();
  verifyStudentEmail.mockReset();
});

describe("VerifyEmailPage", () => {
  test("submits a pasted OTP and shows the success state", async () => {
    verifyStudentEmail.mockResolvedValue({ success: true });
    renderVerification();

    fireEvent.paste(screen.getAllByRole("textbox")[0], {
      clipboardData: { getData: () => "123456" },
    });
    fireEvent.click(screen.getByRole("button", { name: /verify my email/i }));

    expect(await screen.findByText(/ready for what comes next/i)).toBeTruthy();
    expect(verifyStudentEmail).toHaveBeenCalledWith({
      email: "ada@example.com",
      otp: "123456",
    });
  });

  test("shows verification failures without losing the email", async () => {
    verifyStudentEmail.mockRejectedValue(new Error("Verification code has expired. Request a new code."));
    renderVerification();
    fireEvent.paste(screen.getAllByRole("textbox")[0], {
      clipboardData: { getData: () => "123456" },
    });
    fireEvent.click(screen.getByRole("button", { name: /verify my email/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert").textContent).toContain("expired");
    });
    expect(screen.getByText("ada@example.com")).toBeTruthy();
  });

  test("shows and enforces the resend countdown", () => {
    window.sessionStorage.setItem("futurion.verificationEmail", "ada@example.com");
    window.sessionStorage.setItem(
      "futurion.verificationResendAt",
      String(Date.now() + 60000),
    );

    render(
      <MemoryRouter initialEntries={["/verify-email"]}>
        <VerifyEmailPage />
      </MemoryRouter>,
    );

    const resendButton = screen.getByRole("button", { name: /resend in/i });
    expect(resendButton.disabled).toBe(true);
    expect(resendButton.textContent).toMatch(/Resend in (59|60)s/);
  });
});
