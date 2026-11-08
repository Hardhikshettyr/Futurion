const { buildOpportunityFilter, deadlineFilter } = require("../src/services/opportunityLibraryService");

test("builds escaped search and structured explorer filters", async () => {
  const filter = await buildOpportunityFilter({
    q: "research (AI)", opportunityType: "internship", workMode: "remote",
    location: "Bengaluru+", skillId: "507f1f77bcf86cd799439091", deadline: "no_deadline",
  });
  expect(filter).toMatchObject({
    status: "active", opportunityType: "internship", workMode: "remote",
    "requiredSkills.skillId": "507f1f77bcf86cd799439091", applicationDeadline: null,
  });
  expect(filter.location).toBeInstanceOf(RegExp);
  expect(filter.location.test("Bengaluru+")).toBe(true);
  expect(filter.location.test("Bengaluruu")).toBe(false);
  expect(filter.$or).toHaveLength(4);
  expect(filter.$or[0].title.test("Research (AI) placement")).toBe(true);
});

test("separates open, upcoming and expired deadline windows", () => {
  const now = new Date("2026-11-08T00:00:00.000Z");
  expect(deadlineFilter("open", now)).toEqual({ $gte: now });
  expect(deadlineFilter("expired", now)).toEqual({ $lt: now });
  expect(deadlineFilter("upcoming_30", now)).toEqual({ $gte: now, $lte: new Date("2026-12-08T00:00:00.000Z") });
  expect(deadlineFilter("all", now)).toBeNull();
});
