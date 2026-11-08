process.env.OTP_HASH_SECRET = "test-secret-that-is-at-least-thirty-two-characters";

const crypto = require("node:crypto");

jest.mock("../src/models/EmailVerification", () => ({
  create: jest.fn(),
  deleteMany: jest.fn(),
  deleteOne: jest.fn(),
  findOne: jest.fn(),
  findOneAndDelete: jest.fn(),
  findOneAndUpdate: jest.fn(),
}));

jest.mock("../src/models/User", () => ({
  updateOne: jest.fn(),
}));

jest.mock("../src/services/emailService", () => ({
  sendVerificationEmail: jest.fn(),
}));

const EmailVerification = require("../src/models/EmailVerification");
const User = require("../src/models/User");
const { sendVerificationEmail } = require("../src/services/emailService");
const {
  VerificationError,
  generateOtp,
  hashOtp,
  issueVerificationChallenge,
  verifyEmailChallenge,
} = require("../src/services/emailVerificationService");

const userId = "507f1f77bcf86cd799439011";

function selectable(value) {
  return { select: jest.fn().mockResolvedValue(value) };
}

beforeEach(() => {
  EmailVerification.deleteMany.mockResolvedValue({ deletedCount: 0 });
  EmailVerification.deleteOne.mockResolvedValue({ deletedCount: 1 });
  User.updateOne.mockResolvedValue({ matchedCount: 1, modifiedCount: 1 });
  sendVerificationEmail.mockResolvedValue({ accepted: ["ada@example.com"] });
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("OTP primitives", () => {
  test("generates six-digit numeric OTPs", () => {
    for (let index = 0; index < 20; index += 1) {
      expect(generateOtp()).toMatch(/^\d{6}$/);
    }
  });

  test("uses a keyed, user-bound HMAC", () => {
    expect(hashOtp(userId, "123456")).toHaveLength(64);
    expect(hashOtp(userId, "123456")).toBe(hashOtp(userId, "123456"));
    expect(hashOtp(userId, "123456")).not.toBe(
      hashOtp("507f191e810c19729de860ea", "123456"),
    );
  });
});

describe("challenge issuance", () => {
  test("stores only the hash and emails the plaintext OTP", async () => {
    const challenge = {
      _id: "challenge-1",
      expiresAt: new Date(Date.now() + 300000),
    };
    EmailVerification.findOneAndUpdate.mockResolvedValue(challenge);

    await issueVerificationChallenge({
      userId,
      email: "ada@example.com",
    });

    const update = EmailVerification.findOneAndUpdate.mock.calls[0][1];
    const emailedOtp = sendVerificationEmail.mock.calls[0][1];
    expect(update.$set.otpHash).toBe(hashOtp(userId, emailedOtp));
    expect(update.$set).not.toHaveProperty("otp");
    expect(emailedOtp).toMatch(/^\d{6}$/);
  });

  test("removes the exact challenge when email delivery fails", async () => {
    const challenge = {
      _id: "challenge-1",
      expiresAt: new Date(Date.now() + 300000),
    };
    EmailVerification.findOneAndUpdate.mockResolvedValue(challenge);
    sendVerificationEmail.mockRejectedValue(new Error("SMTP unavailable"));

    await expect(
      issueVerificationChallenge({ userId, email: "ada@example.com" }),
    ).rejects.toThrow("SMTP unavailable");

    expect(EmailVerification.deleteOne).toHaveBeenCalledWith({
      _id: "challenge-1",
      otpHash: expect.any(String),
    });
  });

  test("a resend replaces the previous OTP hash", async () => {
    const randomInt = jest
      .spyOn(crypto, "randomInt")
      .mockReturnValueOnce(111111)
      .mockReturnValueOnce(222222);
    EmailVerification.findOneAndUpdate
      .mockResolvedValueOnce({
        _id: "challenge-1",
        expiresAt: new Date(Date.now() + 300000),
      })
      .mockResolvedValueOnce({
        _id: "challenge-1",
        expiresAt: new Date(Date.now() + 300000),
      });

    await issueVerificationChallenge({ userId, email: "ada@example.com" });
    await issueVerificationChallenge({ userId, email: "ada@example.com" });

    const firstHash = EmailVerification.findOneAndUpdate.mock.calls[0][1].$set
      .otpHash;
    const secondHash = EmailVerification.findOneAndUpdate.mock.calls[1][1].$set
      .otpHash;
    expect(firstHash).toBe(hashOtp(userId, "111111"));
    expect(secondHash).toBe(hashOtp(userId, "222222"));
    expect(secondHash).not.toBe(firstHash);
    expect(sendVerificationEmail).toHaveBeenNthCalledWith(
      2,
      "ada@example.com",
      "222222",
    );
    randomInt.mockRestore();
  });

  test("enforces the resend cooldown under a duplicate create race", async () => {
    EmailVerification.findOneAndUpdate.mockResolvedValue(null);
    EmailVerification.create.mockRejectedValue(
      Object.assign(new Error("duplicate"), { code: 11000 }),
    );
    EmailVerification.findOne.mockReturnValue(
      selectable({ lastSentAt: new Date() }),
    );

    await expect(
      issueVerificationChallenge({
        userId,
        email: "ada@example.com",
        enforceCooldown: true,
      }),
    ).rejects.toMatchObject({ code: "RESEND_COOLDOWN" });

    expect(sendVerificationEmail).not.toHaveBeenCalled();
  });
});

describe("challenge verification", () => {
  test("atomically claims a matching challenge and verifies the user", async () => {
    const challenge = {
      _id: "challenge-1",
      userId,
      otpHash: hashOtp(userId, "123456"),
      attempts: 1,
      expiresAt: new Date(Date.now() + 300000),
    };
    EmailVerification.findOneAndUpdate.mockReturnValue(selectable(challenge));
    EmailVerification.findOneAndDelete.mockReturnValue(selectable(challenge));

    await expect(
      verifyEmailChallenge({ userId, otp: "123456" }),
    ).resolves.toEqual({ verified: true });

    expect(User.updateOne).toHaveBeenCalledWith(
      { _id: userId, isEmailVerified: false },
      { $set: { isEmailVerified: true } },
    );
    expect(EmailVerification.deleteMany).toHaveBeenCalledWith({ userId });
  });

  test("rejects an incorrect OTP and reports remaining attempts", async () => {
    const challenge = {
      _id: "challenge-1",
      otpHash: hashOtp(userId, "654321"),
      attempts: 2,
      expiresAt: new Date(Date.now() + 300000),
    };
    EmailVerification.findOneAndUpdate.mockReturnValue(selectable(challenge));

    await expect(
      verifyEmailChallenge({ userId, otp: "123456" }),
    ).rejects.toMatchObject({
      code: "INVALID_OTP",
      details: { remainingAttempts: 3 },
    });

    expect(User.updateOne).not.toHaveBeenCalled();
  });

  test.each([
    [
      "expired",
      { expiresAt: new Date(Date.now() - 1000), attempts: 1 },
      "OTP_EXPIRED",
    ],
    [
      "attempt-limited",
      { expiresAt: new Date(Date.now() + 300000), attempts: 5 },
      "ATTEMPTS_EXCEEDED",
    ],
  ])("rejects an %s challenge", async (_label, challenge, expectedCode) => {
    EmailVerification.findOneAndUpdate.mockReturnValue(selectable(null));
    EmailVerification.findOne.mockResolvedValue({
      _id: "challenge-1",
      ...challenge,
    });

    await expect(
      verifyEmailChallenge({ userId, otp: "123456" }),
    ).rejects.toMatchObject({ code: expectedCode });
  });

  test("rejects a missing verification challenge", async () => {
    EmailVerification.findOneAndUpdate.mockReturnValue(selectable(null));
    EmailVerification.findOne.mockResolvedValue(null);

    await expect(
      verifyEmailChallenge({ userId, otp: "123456" }),
    ).rejects.toMatchObject({ code: "CHALLENGE_NOT_FOUND" });
  });

  test("does not verify a challenge invalidated by a concurrent resend", async () => {
    const challenge = {
      _id: "challenge-1",
      otpHash: hashOtp(userId, "123456"),
      attempts: 1,
      expiresAt: new Date(Date.now() + 300000),
    };
    EmailVerification.findOneAndUpdate.mockReturnValue(selectable(challenge));
    EmailVerification.findOneAndDelete.mockReturnValue(selectable(null));

    await expect(
      verifyEmailChallenge({ userId, otp: "123456" }),
    ).rejects.toBeInstanceOf(VerificationError);
    await expect(
      verifyEmailChallenge({ userId, otp: "123456" }),
    ).rejects.toMatchObject({ code: "CHALLENGE_INVALIDATED" });

    expect(User.updateOne).not.toHaveBeenCalled();
  });
});
