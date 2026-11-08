jest.mock("../src/models/CareerComparison", () => ({ findOne: jest.fn(), deleteOne: jest.fn() }));
jest.mock("../src/models/CareerScenario", () => ({ findOne: jest.fn(), find: jest.fn(), deleteOne: jest.fn() }));
jest.mock("../src/models/Career", () => ({}));
jest.mock("../src/models/Skill", () => ({}));

const CareerComparison = require("../src/models/CareerComparison");
const CareerScenario = require("../src/models/CareerScenario");
const { getComparisonDocument, deleteComparison } = require("../src/services/careerComparisonService");
const { getScenarioDocument, getOwnedScenarios, deleteScenario } = require("../src/services/careerScenarioService");

const userId = "507f1f77bcf86cd799439011";
const otherUserId = "507f1f77bcf86cd799439099";
const comparisonId = "507f1f77bcf86cd799439021";
const scenarioIds = ["507f1f77bcf86cd799439031", "507f1f77bcf86cd799439032"];

beforeEach(() => jest.resetAllMocks());

test("comparison lookup and deletion always include authenticated ownership", async () => {
  CareerComparison.findOne.mockResolvedValue({ _id: comparisonId, userId });
  CareerComparison.deleteOne.mockResolvedValue({ deletedCount: 1 });
  await getComparisonDocument(userId, comparisonId);
  await deleteComparison(userId, comparisonId);
  expect(CareerComparison.findOne).toHaveBeenCalledWith({ _id: comparisonId, userId });
  expect(CareerComparison.deleteOne).toHaveBeenCalledWith({ _id: comparisonId, userId });
  expect(CareerComparison.findOne).not.toHaveBeenCalledWith(expect.objectContaining({ userId: otherUserId }));
});

test("scenario lookup, comparison selection and deletion are ownership scoped", async () => {
  CareerScenario.findOne.mockResolvedValue({ _id: scenarioIds[0], userId });
  CareerScenario.find.mockReturnValue({ lean: jest.fn().mockResolvedValue(scenarioIds.map((_id) => ({ _id, userId, status: "active" }))) });
  CareerScenario.deleteOne.mockResolvedValue({ deletedCount: 1 });
  await getScenarioDocument(userId, scenarioIds[0]);
  await getOwnedScenarios(userId, scenarioIds);
  await deleteScenario(userId, scenarioIds[0]);
  expect(CareerScenario.findOne).toHaveBeenCalledWith({ _id: scenarioIds[0], userId });
  expect(CareerScenario.find).toHaveBeenCalledWith({ _id: { $in: scenarioIds }, userId, status: "active" });
  expect(CareerScenario.deleteOne).toHaveBeenCalledWith({ _id: scenarioIds[0], userId });
});

test("missing owned records return a safe not-found error", async () => {
  CareerComparison.findOne.mockResolvedValue(null);
  CareerScenario.findOne.mockResolvedValue(null);
  await expect(getComparisonDocument(userId, comparisonId)).rejects.toMatchObject({ code: "CAREER_COMPARISON_NOT_FOUND", status: 404 });
  await expect(getScenarioDocument(userId, scenarioIds[0])).rejects.toMatchObject({ code: "CAREER_SCENARIO_NOT_FOUND", status: 404 });
});
