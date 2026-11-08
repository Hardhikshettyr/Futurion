process.env.NODE_ENV = "test";

jest.mock("../src/models/User", () => ({
  create: jest.fn(),
  exists: jest.fn(),
  findOne: jest.fn(),
}));

jest.mock("../src/services/emailVerificationService", () => {
  class VerificationError extends Error {
    constructor(code, message, details = {}) {
      super(message);
      this.code = code;
      this.details = details;
    }
  }

  return {
    OTP_EXPIRY_SECONDS: 300,
    RESEND_COOLDOWN_SECONDS: 60,
    VerificationError,
    issueVerificationChallenge: jest.fn(),
    verifyEmailChallenge: jest.fn(),
  };
});

const request = require("supertest");
const app = require("../src/app");
const User = require("../src/models/User");
const {
  VerificationError,
  issueVerificationChallenge,
  verifyEmailChallenge,
} = require("../src/services/emailVerificationService");

const validRegistration = {
  name: "Ada Lovelace",
  email: "ada@example.com",
  password: "SecurePassword123!",
  confirmPassword: "SecurePassword123!",
};

const createdUser = {
  _id: { toString: () => "user-1" },
  name: "Ada Lovelace",
  email: "ada@example.com",
  role: "student",
  isEmailVerified: false,
  isActive: true,
  createdAt: new Date("2026-11-07T08:00:00.000Z"),
};

function mockUserLookup(user) {
  User.findOne.mockReturnValue({
    select: jest.fn().mockResolvedValue(user),
  });
}

beforeEach(() => {
  User.exists.mockResolvedValue(null);
  User.create.mockResolvedValue(createdUser);
  issueVerificationChallenge.mockResolvedValue({
    expiresInSeconds: 300,
    resendCooldownSeconds: 60,
  });
  verifyEmailChallenge.mockResolvedValue({ verified: true });
});

describe("POST /api/auth/register", () => {
  test("creates an unverified student and starts email verification", async () => {
    const response = await request(app)
      .post("/api/auth/register")
      .send(validRegistration)
      .expect(201);

    expect(User.create).toHaveBeenCalledWith({
      name: "Ada Lovelace",
      email: "ada@example.com",
      password: "SecurePassword123!",
    });
    expect(issueVerificationChallenge).toHaveBeenCalledWith({
      userId: createdUser._id,
      email: createdUser.email,
    });
    expect(response.body.user.role).toBe("student");
    expect(response.body.user.isEmailVerified).toBe(false);
    expect(response.body.user.password).toBeUndefined();
    expect(response.body.verification.emailSent).toBe(true);
  });

  test.each([
    [{ ...validRegistration, email: "not-an-email" }, "email"],
    [{ ...validRegistration, name: "" }, "name"],
    [{ ...validRegistration, password: "short", confirmPassword: "short" }, "password"],
    [{ ...validRegistration, confirmPassword: "DifferentPassword123!" }, "confirmPassword"],
  ])("rejects invalid registration input", async (body, field) => {
    const response = await request(app)
      .post("/api/auth/register")
      .send(body)
      .expect(400);

    expect(response.body.errors.some((error) => error.field === field)).toBe(true);
    expect(User.create).not.toHaveBeenCalled();
  });

  test("rejects a duplicate email", async () => {
    User.exists.mockResolvedValue({ _id: "existing" });

    await request(app)
      .post("/api/auth/register")
      .send(validRegistration)
      .expect(409);

    expect(User.create).not.toHaveBeenCalled();
  });

  test("keeps registration recoverable when email delivery fails", async () => {
    issueVerificationChallenge.mockRejectedValue(new Error("SMTP unavailable"));
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});

    const response = await request(app)
      .post("/api/auth/register")
      .send(validRegistration)
      .expect(201);

    expect(response.body.verification.emailSent).toBe(false);
    expect(response.body.message).not.toMatch(/SMTP/i);
    consoleError.mockRestore();
  });
});

describe("email verification endpoints", () => {
  test("verifies a valid OTP", async () => {
    mockUserLookup({
      _id: "user-1",
      email: "ada@example.com",
      isEmailVerified: false,
    });

    const response = await request(app)
      .post("/api/auth/verify-email")
      .send({ email: "ada@example.com", otp: "123456" })
      .expect(200);

    expect(verifyEmailChallenge).toHaveBeenCalledWith({
      userId: "user-1",
      otp: "123456",
    });
    expect(response.body.verification.isEmailVerified).toBe(true);
  });

  test.each([
    ["INVALID_OTP", 400],
    ["OTP_EXPIRED", 410],
    ["ATTEMPTS_EXCEEDED", 429],
  ])("maps %s failures safely", async (code, expectedStatus) => {
    mockUserLookup({
      _id: "user-1",
      email: "ada@example.com",
      isEmailVerified: false,
    });
    verifyEmailChallenge.mockRejectedValue(
      new VerificationError(code, "internal service detail", {
        remainingAttempts: 3,
      }),
    );

    const response = await request(app)
      .post("/api/auth/verify-email")
      .send({ email: "ada@example.com", otp: "123456" })
      .expect(expectedStatus);

    expect(response.body.message).not.toBe("internal service detail");
  });

  test("returns success for an already verified account", async () => {
    mockUserLookup({
      _id: "user-1",
      email: "ada@example.com",
      isEmailVerified: true,
    });

    await request(app)
      .post("/api/auth/verify-email")
      .send({ email: "ada@example.com", otp: "123456" })
      .expect(200);

    expect(verifyEmailChallenge).not.toHaveBeenCalled();
  });

  test("uses the same generic resend response for missing accounts", async () => {
    mockUserLookup(null);

    const response = await request(app)
      .post("/api/auth/resend-verification")
      .send({ email: "unknown@example.com" })
      .expect(200);

    expect(response.body.message).toMatch(/If an unverified account exists/);
    expect(issueVerificationChallenge).not.toHaveBeenCalled();
  });
});
