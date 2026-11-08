jest.mock("../src/models/StudentLearningResource", () => ({ findOne: jest.fn(), deleteOne: jest.fn() }));
jest.mock("../src/services/learningResourceService", () => ({ findResource: jest.fn(), presentResource: jest.fn(), presentStudentState: jest.fn() }));

const StudentLearningResource = require("../src/models/StudentLearningResource");
const { removeLearningItem, requireOwnedLearningItem, updateLearningItem } = require("../src/services/studentLearningService");

const ids = { user: "507f1f77bcf86cd799439011", other: "507f1f77bcf86cd799439099", item: "507f1f77bcf86cd799439021" };

beforeEach(() => jest.resetAllMocks());

test("student learning reads, updates and deletes always include authenticated ownership", async () => {
  const item = { _id: ids.item, userId: ids.user, status: "not_started", save: jest.fn().mockResolvedValue(undefined) };
  StudentLearningResource.findOne.mockResolvedValue(item);
  StudentLearningResource.deleteOne.mockResolvedValue({ deletedCount: 1 });
  await requireOwnedLearningItem(ids.user, ids.item);
  expect(StudentLearningResource.findOne).toHaveBeenCalledWith({ _id: ids.item, userId: ids.user });
  StudentLearningResource.findOne.mockResolvedValueOnce(item).mockReturnValueOnce({ populate: jest.fn().mockResolvedValue({ ...item, toObject: () => ({ ...item, resourceId: null }) }) });
  await updateLearningItem(ids.user, ids.item, { status: "completed" });
  expect(item.inLearningLibrary).toBe(true);
  expect(item.completedAt).toBeInstanceOf(Date);
  await removeLearningItem(ids.user, ids.item);
  expect(StudentLearningResource.deleteOne).toHaveBeenCalledWith({ _id: ids.item, userId: ids.user });
  expect(StudentLearningResource.deleteOne).not.toHaveBeenCalledWith(expect.objectContaining({ userId: ids.other }));
});

test("missing owned items return a safe not-found response", async () => {
  StudentLearningResource.findOne.mockResolvedValue(null);
  await expect(requireOwnedLearningItem(ids.user, ids.item)).rejects.toMatchObject({ status: 404, code: "LEARNING_ITEM_NOT_FOUND" });
});
