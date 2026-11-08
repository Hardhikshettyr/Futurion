import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { expect, test, vi } from "vitest";
import OpportunityCard from "./OpportunityCard.jsx";

const opportunity = {
  id: "507f1f77bcf86cd799439071", title: "Research Internship", organization: "Research Lab",
  opportunityTypeLabel: "Internship", location: "Remote", workMode: "remote", description: "Build grounded research experience.",
  requiredSkills: [{ skill: { id: "507f1f77bcf86cd799439072", name: "Data Analysis" }, minimumProficiency: "beginner" }],
  applicationDeadline: "2027-01-20T23:59:59.999Z", daysRemaining: 20, expired: false,
  studentState: { saved: false, inTracker: false },
};

test("renders opportunity evidence, eligibility and the detail route", () => {
  render(<MemoryRouter><OpportunityCard opportunity={opportunity} eligibility={{ overall: "potentially_eligible", overallLabel: "Potentially Eligible" }} reasons={["Connects to a career you saved."]} /></MemoryRouter>);
  expect(screen.getByRole("heading", { name: "Research Internship" })).toBeTruthy();
  expect(screen.getByText("Potentially Eligible")).toBeTruthy();
  expect(screen.getByText(/Data Analysis/)).toBeTruthy();
  expect(screen.getByRole("link", { name: "View details" }).getAttribute("href")).toBe(`/dashboard/opportunities/${opportunity.id}`);
});

test("supports explicit save and tracking actions", async () => {
  const user = userEvent.setup();
  const onSave = vi.fn(); const onTrack = vi.fn();
  render(<MemoryRouter><OpportunityCard opportunity={opportunity} onSave={onSave} onTrack={onTrack} /></MemoryRouter>);
  await user.click(screen.getByRole("button", { name: "Save" }));
  await user.click(screen.getByRole("button", { name: "Track application" }));
  expect(onSave).toHaveBeenCalledWith(opportunity.id);
  expect(onTrack).toHaveBeenCalledWith(opportunity.id);
});
