import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, test, vi } from "vitest";
import LoginPage from "./LoginPage.jsx";

const { loginMock } = vi.hoisted(() => ({ loginMock: vi.fn() }));

vi.mock("../context/AuthContext.jsx", () => ({
  useAuth: () => ({ login: loginMock }),
}));

function renderLogin() {
  return render(
    <MemoryRouter initialEntries={["/login"]}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/dashboard" element={<div>Authenticated dashboard</div>} />
        <Route path="/verify-email" element={<div>Verification screen</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

function fillLogin() {
  fireEvent.change(screen.getByLabelText("Email address"), {
    target: { value: "ada@example.com" },
  });
  fireEvent.change(screen.getByLabelText("Password"), {
    target: { value: "SecurePassword123!" },
  });
}

beforeEach(() => loginMock.mockReset());

describe("LoginPage", () => {
  test("validates before submitting", () => {
    renderLogin();
    fireEvent.click(screen.getByRole("button", { name: /^sign in/i }));
    expect(screen.getByText("Enter a valid email address")).toBeTruthy();
    expect(loginMock).not.toHaveBeenCalled();
  });

  test("navigates to the protected dashboard after login", async () => {
    loginMock.mockResolvedValue({ user: { name: "Ada" } });
    renderLogin();
    fillLogin();
    fireEvent.click(screen.getByRole("button", { name: /^sign in/i }));
    expect(await screen.findByText("Authenticated dashboard")).toBeTruthy();
  });

});
