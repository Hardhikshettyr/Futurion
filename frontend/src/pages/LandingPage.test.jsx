import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, test, vi } from "vitest";
import LandingPage from "./LandingPage.jsx";

vi.mock("../context/AuthContext.jsx", () => ({
  useAuth: () => ({ user: null }),
}));

describe("LandingPage", () => {
  test("presents the public brand story and working account entry points", () => {
    render(<MemoryRouter><LandingPage /></MemoryRouter>);

    expect(screen.getByRole("heading", { name: /your future deserves a clear direction/i })).toBeTruthy();
    expect(screen.getAllByAltText("Futurion — Plan, Learn, Grow").length).toBeGreaterThan(0);
    expect(screen.getByAltText(/student holding a large yellow pencil/i)).toBeTruthy();
    expect(screen.getAllByRole("link", { name: /^login$/i })[0].getAttribute("href")).toBe("/login");
    expect(screen.getAllByRole("link", { name: /get started/i })[0].getAttribute("href")).toBe("/register");
    expect(screen.getByRole("heading", { name: /your career journey, connected/i })).toBeTruthy();
    expect(screen.getByRole("heading", { name: /take the next step towards your future/i })).toBeTruthy();
  });
});
