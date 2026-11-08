const { generatePortfolioPdf } = require("../src/services/portfolioPdfService");

test("generates a valid PDF from only the supplied portfolio projection", async () => {
  const buffer = await generatePortfolioPdf({ name: "Jane Student", publicSlug: "jane", sections: { about: { headline: "Developer", summary: "Builds accessible products.", location: "India" }, projects: [{ id: "507f1f77bcf86cd799440041", title: "Futurion", description: "Career intelligence platform", role: "Developer", category: "Web", technologies: ["React"], startDate: "2026-01", endDate: "", ongoing: true, contributions: ["Built the dashboard"], outcomes: [], githubUrl: "", liveUrl: "" }] } });
  expect(buffer.subarray(0, 4).toString()).toBe("%PDF");
  expect(buffer.length).toBeGreaterThan(1500);
});
