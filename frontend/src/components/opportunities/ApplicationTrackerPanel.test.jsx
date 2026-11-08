import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { expect, test, vi } from "vitest";
import ApplicationTrackerPanel from "./ApplicationTrackerPanel.jsx";

const application = {
  id: "507f1f77bcf86cd799439081", status: "planning_to_apply", applicationDate: null, notes: "",
  opportunity: { id: "507f1f77bcf86cd799439082", title: "Research Internship", organization: "Research Lab", opportunityTypeLabel: "Internship", applicationDeadline: null },
};

test("updates only user-maintained tracker fields and can remove a record", async () => {
  const user = userEvent.setup(); const onUpdate = vi.fn(); const onRemove = vi.fn();
  render(<MemoryRouter><ApplicationTrackerPanel applications={[application]} onUpdate={onUpdate} onRemove={onRemove} /></MemoryRouter>);
  await user.selectOptions(screen.getByLabelText("Status"), "applied");
  await user.click(screen.getByRole("button", { name: "Remove from tracker" }));
  expect(onUpdate).toHaveBeenCalledWith(application.id, { status: "applied" });
  expect(onRemove).toHaveBeenCalledWith(application.id);
  expect(screen.getByText(/never submits an application automatically/i)).toBeTruthy();
});
