jest.mock("../src/models/PortfolioSettings", () => ({ findOne: jest.fn() }));
jest.mock("../src/models/User", () => ({ findById: jest.fn() }));
jest.mock("../src/services/progressService", () => ({ getProgressBundle: jest.fn() }));

const PortfolioSettings = require("../src/models/PortfolioSettings");
const User = require("../src/models/User");
const { getProgressBundle } = require("../src/services/progressService");
const { getPublicPortfolio } = require("../src/services/portfolioService");

function leanResult(value) { return { lean: jest.fn().mockResolvedValue(value) }; }

beforeEach(() => jest.clearAllMocks());

test("disabled or unknown public portfolios are immediately unavailable", async () => {
  PortfolioSettings.findOne.mockReturnValue(leanResult(null));
  await expect(getPublicPortfolio("private-student")).rejects.toMatchObject({ status: 404, code: "PUBLIC_PORTFOLIO_NOT_FOUND" });
  expect(PortfolioSettings.findOne).toHaveBeenCalledWith({ publicSlug: "private-student", isPublic: true });
  expect(getProgressBundle).not.toHaveBeenCalled();
});

test("enabled public access returns the backend privacy projection", async () => {
  PortfolioSettings.findOne.mockReturnValue(leanResult({ userId: "507f1f77bcf86cd799440031", publicSlug: "jane", isPublic: true, visibleSections: ["about"], selectedAchievementKeys: [] }));
  User.findById.mockReturnValue({ select: jest.fn().mockReturnValue(leanResult({ _id: "507f1f77bcf86cd799440031", name: "Jane", isActive: true })) });
  getProgressBundle.mockResolvedValue({ data: { profile: { personal: { headline: "Developer", summary: "Public summary", phone: "secret" } }, skills: [] }, achievements: [] });
  const result = await getPublicPortfolio("jane");
  expect(result.sections.about.summary).toBe("Public summary");
  expect(JSON.stringify(result)).not.toContain("secret");
});
