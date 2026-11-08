import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { expect, test, vi } from "vitest";
import profileFixture from "../test/profileFixture.js";
import ProfilePage from "./ProfilePage.jsx";

vi.mock("../context/StudentProfileContext.jsx", () => ({
  useStudentProfile: () => ({ error: "", isLoading: false, profile: profileFixture, refreshProfile: vi.fn() }),
}));
vi.mock("../context/AuthContext.jsx", () => ({
  useAuth: () => ({ logout: vi.fn(), user: { name: "Ada Lovelace", email: "ada@example.com", role: "student" } }),
}));
vi.mock("../hooks/usePrivateImage.js", () => ({ default: () => "" }));

test("shows backend profile data, completeness, and useful empty states", () => {
  render(<MemoryRouter><ProfilePage /></MemoryRouter>);
  expect(screen.getByRole("heading", { name: "Ada Lovelace" })).toBeTruthy();
  expect(screen.getByText("Student researcher")).toBeTruthy();
  expect(screen.getByText("18%")).toBeTruthy();
  expect(screen.getByText("No education added yet.")).toBeTruthy();
  expect(screen.getByRole("link", { name: "Manage resume" }).getAttribute("href")).toContain("section=resume");
});
