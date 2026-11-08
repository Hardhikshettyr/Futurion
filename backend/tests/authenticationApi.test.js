jest.mock("../src/models/User", () => ({
  create: jest.fn(),
  exists: jest.fn(),
  findById: jest.fn(),
  findOne: jest.fn(),
}));

jest.mock("../src/models/Session", () => ({
  find: jest.fn(),
  findOneAndUpdate: jest.fn(),
  updateOne: jest.fn(),
}));

jest.mock("../src/services/sessionService", () => {
  class AuthenticationError extends Error {
    constructor(code, message, status = 401) {
      super(message);
      this.code = code;
      this.status = status;
    }
  }
  return {
    AuthenticationError,
    clearSessionCookies: jest.fn(),
    createSession: jest.fn(),
    issueCsrfForRequest: jest.fn(),
    revokeAllUserSessions: jest.fn(),
    revokeOtherUserSessions: jest.fn(),
    revokeSessionFromToken: jest.fn(),
    rotateCurrentSession: jest.fn(),
    rotateRefreshSession: jest.fn(),
  };
});

jest.mock("../src/services/passwordResetService", () => {
  class PasswordResetError extends Error {
    constructor(code, message) {
      super(message);
      this.code = code;
    }
  }
  return {
    PasswordResetError,
    issuePasswordResetChallenge: jest.fn(),
    resetPasswordWithOtp: jest.fn(),
  };
});

jest.mock("../src/services/tokenService", () => ({
  readAuthCookies: jest.fn(() => ({ refreshToken: "refresh-token" })),
}));

jest.mock("../src/middleware/authenticate", () => ({
  authenticate(request, _response, next) {
    request.auth = {
      sessionId: "507f191e810c19729de860ea",
      userId: "507f1f77bcf86cd799439011",
      user: {
        _id: { toString: () => "507f1f77bcf86cd799439011" },
        name: "Ada Lovelace",
        email: "ada@example.com",
        role: "student",
        isEmailVerified: true,
        isActive: true,
        createdAt: new Date("2026-01-01"),
      },
    };
    next();
  },
}));

jest.mock("../src/middleware/csrfProtection", () => ({
  requireCsrf(_request, _response, next) {
    next();
  },
}));

const request = require("supertest");
const app = require("../src/app");
const Session = require("../src/models/Session");
const User = require("../src/models/User");
const {
  issuePasswordResetChallenge,
  resetPasswordWithOtp,
} = require("../src/services/passwordResetService");
const {
  createSession,
  revokeAllUserSessions,
  revokeSessionFromToken,
  rotateCurrentSession,
  rotateRefreshSession,
} = require("../src/services/sessionService");

const user = {
  _id: { toString: () => "507f1f77bcf86cd799439011" },
  name: "Ada Lovelace",
  email: "ada@example.com",
  role: "student",
  isEmailVerified: true,
  isActive: true,
  createdAt: new Date("2026-01-01"),
  comparePassword: jest.fn(),
  save: jest.fn(),
};

function selectable(value) {
  return { select: jest.fn().mockResolvedValue(value) };
}

beforeEach(() => {
  user.comparePassword.mockResolvedValue(true);
  user.save.mockResolvedValue(user);
  User.findOne.mockReturnValue(selectable(user));
  User.findById.mockReturnValue(selectable(user));
  createSession.mockResolvedValue({ csrfToken: "csrf", session: {} });
  rotateRefreshSession.mockResolvedValue({ csrfToken: "csrf-2", user });
  rotateCurrentSession.mockResolvedValue("csrf-3");
  revokeAllUserSessions.mockResolvedValue({ modifiedCount: 2 });
  issuePasswordResetChallenge.mockResolvedValue();
  resetPasswordWithOtp.mockResolvedValue();
});

describe("login and session endpoints", () => {
  test("logs in a verified active account without returning tokens", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({ email: "ADA@EXAMPLE.COM", password: "SecurePassword123!" })
      .expect(200);

    expect(createSession).toHaveBeenCalled();
    expect(response.body.authenticated).toBe(true);
    expect(response.body.user.email).toBe("ada@example.com");
    expect(response.body.accessToken).toBeUndefined();
    expect(response.body.refreshToken).toBeUndefined();
  });

  test("returns a generic error for incorrect credentials", async () => {
    user.comparePassword.mockResolvedValue(false);
    const response = await request(app)
      .post("/api/auth/login")
      .send({ email: "ada@example.com", password: "wrong-password" })
      .expect(401);
    expect(response.body.code).toBe("INVALID_CREDENTIALS");
  });

  test.each([
    [{ isEmailVerified: false, isActive: true }, "EMAIL_NOT_VERIFIED"],
    [{ isEmailVerified: true, isActive: false }, "ACCOUNT_INACTIVE"],
  ])("rejects unavailable accounts", async (state, expectedCode) => {
    User.findOne.mockReturnValue(selectable({ ...user, ...state }));
    const response = await request(app)
      .post("/api/auth/login")
      .send({ email: "ada@example.com", password: "SecurePassword123!" })
      .expect(403);
    expect(response.body.code).toBe(expectedCode);
  });

  test("refreshes and rotates the session", async () => {
    const response = await request(app).post("/api/auth/refresh").expect(200);
    expect(rotateRefreshSession).toHaveBeenCalledWith(
      expect.objectContaining({ refreshToken: "refresh-token" }),
    );
    expect(response.body.user.email).toBe("ada@example.com");
  });

  test("logs out idempotently", async () => {
    await request(app).post("/api/auth/logout").expect(200);
    expect(revokeSessionFromToken).toHaveBeenCalledWith("refresh-token");
  });

  test("logs out from all devices", async () => {
    await request(app).post("/api/auth/logout-all").expect(200);
    expect(revokeAllUserSessions).toHaveBeenCalledWith(
      "507f1f77bcf86cd799439011",
    );
  });

  test("returns the current safe user", async () => {
    const response = await request(app).get("/api/auth/me").expect(200);
    expect(response.body.user.role).toBe("student");
    expect(response.body.user.password).toBeUndefined();
  });
});

describe("password recovery and change", () => {
  test("uses the same forgot-password response for an unknown email", async () => {
    User.findOne.mockReturnValue(selectable(null));
    const response = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: "unknown@example.com" })
      .expect(200);
    expect(response.body.message).toMatch(/If an eligible account exists/);
    expect(issuePasswordResetChallenge).not.toHaveBeenCalled();
  });

  test("issues a reset challenge for an eligible account", async () => {
    await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: "ada@example.com" })
      .expect(200);
    expect(issuePasswordResetChallenge).toHaveBeenCalledWith({
      userId: user._id,
      email: user.email,
    });
  });

  test("resets a password and revokes sessions through the service", async () => {
    await request(app)
      .post("/api/auth/reset-password")
      .send({
        email: "ada@example.com",
        otp: "123456",
        newPassword: "NewPassword123!",
        confirmPassword: "NewPassword123!",
      })
      .expect(200);
    expect(resetPasswordWithOtp).toHaveBeenCalledWith({
      userId: user._id,
      otp: "123456",
      newPassword: "NewPassword123!",
    });
  });

  test("changes password, revokes other sessions, and rotates the current one", async () => {
    user.comparePassword
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);
    await request(app)
      .patch("/api/auth/change-password")
      .send({
        currentPassword: "SecurePassword123!",
        newPassword: "NewPassword123!",
        confirmPassword: "NewPassword123!",
      })
      .expect(200);
    expect(user.save).toHaveBeenCalled();
    expect(rotateCurrentSession).toHaveBeenCalled();
  });

  test("rejects an incorrect current password", async () => {
    user.comparePassword.mockResolvedValue(false);
    const response = await request(app)
      .patch("/api/auth/change-password")
      .send({
        currentPassword: "WrongPassword123!",
        newPassword: "NewPassword123!",
        confirmPassword: "NewPassword123!",
      })
      .expect(400);
    expect(response.body.message).toMatch(/incorrect/i);
  });
});

describe("session management", () => {
  test("lists safe session metadata", async () => {
    Session.find.mockReturnValue({
      sort: jest.fn().mockResolvedValue([
        {
          _id: { toString: () => "507f191e810c19729de860ea", equals: () => true },
          userAgent: "Mozilla/5.0 Chrome/130",
          createdAt: new Date(),
          lastUsedAt: new Date(),
        },
      ]),
    });
    const response = await request(app).get("/api/auth/sessions").expect(200);
    expect(response.body.sessions[0].current).toBe(true);
    expect(response.body.sessions[0].refreshTokenHash).toBeUndefined();
  });

  test("revokes only a session owned by the current user", async () => {
    Session.findOneAndUpdate.mockResolvedValue({
      _id: { equals: () => false },
    });
    await request(app)
      .delete("/api/auth/sessions/507f191e810c19729de860eb")
      .expect(200);
    expect(Session.findOneAndUpdate.mock.calls[0][0]).toEqual(
      expect.objectContaining({ userId: "507f1f77bcf86cd799439011" }),
    );
  });
});
