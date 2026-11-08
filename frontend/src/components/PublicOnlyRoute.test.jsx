import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, test, vi } from "vitest";
import PublicOnlyRoute from "./PublicOnlyRoute.jsx";

const { authState } = vi.hoisted(() => ({ authState: { isLoading: false, user: null } }));
vi.mock("../context/AuthContext.jsx", () => ({ useAuth: () => authState }));

describe("PublicOnlyRoute", () => {
  test("redirects an authenticated visitor to the dashboard", () => {
    authState.user = { name: "Ada" };
    render(<MemoryRouter initialEntries={["/login"]}><Routes><Route path="/login" element={<PublicOnlyRoute><div>Login form</div></PublicOnlyRoute>} /><Route path="/dashboard" element={<div>Student dashboard</div>} /></Routes></MemoryRouter>);
    expect(screen.getByText("Student dashboard")).toBeTruthy();
    authState.user = null;
  });

  test("renders the public page for a signed-out visitor", () => {
    authState.user = null;
    render(<MemoryRouter><PublicOnlyRoute><div>Login form</div></PublicOnlyRoute></MemoryRouter>);
    expect(screen.getByText("Login form")).toBeTruthy();
  });
});
