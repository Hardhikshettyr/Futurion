jest.mock("../src/models/PasswordResetChallenge", () => ({
  create: jest.fn(),
  deleteMany: jest.fn(),
  deleteOne: jest.fn(),
  findOne: jest.fn(),
  findOneAndDelete: jest.fn(),
  findOneAndUpdate: jest.fn(),
}));

jest.mock("../src/models/Session", () => ({
  updateMany: jest.fn(),
}));

jest.mock("../src/models/User", () => ({
  findById: jest.fn(),
}));

jest.mock("../src/services/emailService", () => ({
  sendPasswordResetEmail: jest.fn(),
}));

const Challenge = require("../src/models/PasswordResetChallenge");
const Session = require("../src/models/Session");
const User = require("../src/models/User");
const { sendPasswordResetEmail } = require("../src/services/emailService");
const {
  hashResetOtp,
  issuePasswordResetChallenge,
  resetPasswordWithOtp,
} = require("../src/services/passwordResetService");

const userId = "507f1f77bcf86cd799439011";

function selectable(value) {
  return { select: jest.fn().mockResolvedValue(value) };
}

beforeEach(() => {
  sendPasswordResetEmail.mockResolvedValue({ accepted: ["ada@example.com"] });
  Challenge.deleteMany.mockResolvedValue({ deletedCount: 1 });
  Challenge.deleteOne.mockResolvedValue({ deletedCount: 1 });
  Session.updateMany.mockResolvedValue({ modifiedCount: 2 });
});

test("issues a separate password-reset challenge without storing plaintext", async () => {
  Challenge.findOneAndUpdate.mockResolvedValue(null);
  Challenge.create.mockImplementation(async (values) => ({
    _id: "reset-1",
    ...values,
  }));

  await issuePasswordResetChallenge({ userId, email: "ada@example.com" });
  const stored = Challenge.create.mock.calls[0][0];
  const emailedOtp = sendPasswordResetEmail.mock.calls[0][1];
  expect(stored.otpHash).toBe(hashResetOtp(userId, emailedOtp));
  expect(stored).not.toHaveProperty("otp");
});

test("rejects an incorrect reset OTP", async () => {
  Challenge.findOneAndUpdate.mockReturnValue(
    selectable({
      _id: "reset-1",
      otpHash: hashResetOtp(userId, "654321"),
      attempts: 1,
      expiresAt: new Date(Date.now() + 600000),
    }),
  );

  await expect(
    resetPasswordWithOtp({ userId, otp: "123456", newPassword: "NewPass123!" }),
  ).rejects.toMatchObject({ code: "RESET_INVALID" });
});

test.each([
  [new Date(Date.now() - 1000), 1, "RESET_EXPIRED"],
  [new Date(Date.now() + 600000), 5, "RESET_ATTEMPTS_EXCEEDED"],
])("rejects expired or attempt-limited reset challenges", async (expiresAt, attempts, code) => {
  Challenge.findOneAndUpdate.mockReturnValue(selectable(null));
  Challenge.findOne.mockResolvedValue({ _id: "reset-1", expiresAt, attempts });
  await expect(
    resetPasswordWithOtp({ userId, otp: "123456", newPassword: "NewPass123!" }),
  ).rejects.toMatchObject({ code });
});

test("resets the password and revokes every active session", async () => {
  const challenge = {
    _id: "reset-1",
    otpHash: hashResetOtp(userId, "123456"),
    attempts: 1,
    expiresAt: new Date(Date.now() + 600000),
  };
  Challenge.findOneAndUpdate.mockReturnValue(selectable(challenge));
  Challenge.findOneAndDelete.mockReturnValue(selectable(challenge));
  const user = { password: "old", save: jest.fn().mockResolvedValue() };
  User.findById.mockResolvedValue(user);

  await resetPasswordWithOtp({
    userId,
    otp: "123456",
    newPassword: "NewPass123!",
  });

  expect(user.password).toBe("NewPass123!");
  expect(user.save).toHaveBeenCalled();
  expect(Session.updateMany).toHaveBeenCalledWith(
    { userId, revokedAt: null },
    expect.objectContaining({
      $set: expect.objectContaining({ revokedReason: "password_reset" }),
    }),
  );
});
