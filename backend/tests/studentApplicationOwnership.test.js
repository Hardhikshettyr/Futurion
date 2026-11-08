jest.mock("../src/models/StudentApplication", () => ({
  findOne: jest.fn(),
  deleteOne: jest.fn(),
}));
jest.mock("../src/services/opportunityLibraryService", () => ({
  findOpportunity: jest.fn(),
  presentOpportunity: jest.fn((value) => value),
}));

const StudentApplication = require("../src/models/StudentApplication");
const { removeApplication, updateApplication } = require("../src/services/studentApplicationService");

const ids = { user: "507f1f77bcf86cd799439041", other: "507f1f77bcf86cd799439042", application: "507f1f77bcf86cd799439043" };

beforeEach(() => jest.clearAllMocks());

test("application updates always include the authenticated owner", async () => {
  const application = {
    _id: ids.application, userId: ids.user, status: "interested", saved: true, inTracker: true,
    opportunityId: { _id: "507f1f77bcf86cd799439044", title: "Internship" },
    save: jest.fn().mockResolvedValue(undefined),
  };
  StudentApplication.findOne.mockReturnValue({ populate: jest.fn().mockResolvedValue(application) });
  const result = await updateApplication(ids.user, ids.application, { status: "applied", notes: "Submitted directly on the official site." });
  expect(StudentApplication.findOne).toHaveBeenCalledWith({ _id: ids.application, userId: ids.user });
  expect(application.save).toHaveBeenCalled();
  expect(result.status).toBe("applied");
});

test("cannot remove another student's application record", async () => {
  StudentApplication.deleteOne.mockResolvedValue({ deletedCount: 0 });
  await expect(removeApplication(ids.other, ids.application)).rejects.toMatchObject({ status: 404, code: "APPLICATION_NOT_FOUND" });
  expect(StudentApplication.deleteOne).toHaveBeenCalledWith({ _id: ids.application, userId: ids.other });
});
