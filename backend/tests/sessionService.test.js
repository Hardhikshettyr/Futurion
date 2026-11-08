jest.mock("../src/models/Session", () => ({
  findById: jest.fn(),
  findOne: jest.fn(),
  findOneAndUpdate: jest.fn(),
  updateMany: jest.fn(),
  updateOne: jest.fn(),
}));

jest.mock("../src/models/User", () => ({
  findById: jest.fn(),
}));

const Session = require("../src/models/Session");
const User = require("../src/models/User");
const {
  REFRESH_CONCURRENCY_WINDOW_MS,
  rotateRefreshSession,
} = require("../src/services/sessionService");
const {
  hashRefreshToken,
  signRefreshToken,
} = require("../src/services/tokenService");

const userId = "507f1f77bcf86cd799439011";
const sessionId = "507f191e810c19729de860ea";

function selectable(value) {
  return { select: jest.fn().mockResolvedValue(value) };
}

function createResponse() {
  return { cookie: jest.fn(), clearCookie: jest.fn() };
}

function activeSession(overrides = {}) {
  return {
    _id: sessionId,
    userId,
    expiresAt: new Date(Date.now() + 86400000),
    revokedAt: null,
    previousRefreshTokenHash: null,
    lastRotatedAt: null,
    ...overrides,
  };
}

const activeUser = {
  _id: { toString: () => userId },
  name: "Ada Lovelace",
  email: "ada@example.com",
  role: "student",
  isEmailVerified: true,
  isActive: true,
  createdAt: new Date(),
};

beforeEach(() => {
  User.findById.mockReturnValue(selectable(activeUser));
  Session.updateOne.mockResolvedValue({ modifiedCount: 1 });
});

describe("refresh token rotation", () => {
  test("rejects a malformed refresh token before querying the database", async () => {
    await expect(
      rotateRefreshSession({
        refreshToken: "not-a-jwt",
        response: createResponse(),
      }),
    ).rejects.toMatchObject({ code: "REFRESH_TOKEN_INVALID", status: 401 });
    expect(Session.findById).not.toHaveBeenCalled();
  });

  test("rejects an expired refresh token before querying the database", async () => {
    const originalExpiry = process.env.JWT_REFRESH_EXPIRES_IN;
    process.env.JWT_REFRESH_EXPIRES_IN = "1s";
    jest.useFakeTimers({ now: new Date("2026-01-01T00:00:00.000Z") });

    try {
      const refreshToken = signRefreshToken({ userId, sessionId });
      jest.advanceTimersByTime(2000);

      await expect(
        rotateRefreshSession({ refreshToken, response: createResponse() }),
      ).rejects.toMatchObject({ code: "REFRESH_TOKEN_INVALID", status: 401 });
      expect(Session.findById).not.toHaveBeenCalled();
    } finally {
      jest.useRealTimers();
      process.env.JWT_REFRESH_EXPIRES_IN = originalExpiry;
    }
  });

  test("rotates a valid refresh token and sets new cookies", async () => {
    const refreshToken = signRefreshToken({ userId, sessionId });
    const currentHash = hashRefreshToken(refreshToken);
    const session = activeSession({ refreshTokenHash: currentHash });
    Session.findById.mockReturnValue(selectable(session));
    Session.findOneAndUpdate.mockReturnValue(
      selectable(activeSession({ refreshTokenHash: "next-hash" })),
    );
    const response = createResponse();

    const result = await rotateRefreshSession({ refreshToken, response });

    expect(result.user).toBe(activeUser);
    expect(result.csrfToken).toBeTruthy();
    expect(response.cookie).toHaveBeenCalledTimes(3);
    const update = Session.findOneAndUpdate.mock.calls[0][1].$set;
    expect(update.previousRefreshTokenHash).toBe(currentHash);
    expect(update.refreshTokenHash).not.toBe(currentHash);
  });

  test("rejects an immediate concurrent refresh without revoking the session", async () => {
    const oldToken = signRefreshToken({ userId, sessionId });
    const oldHash = hashRefreshToken(oldToken);
    Session.findById.mockReturnValue(
      selectable(
        activeSession({
          refreshTokenHash: "new-hash",
          previousRefreshTokenHash: oldHash,
          lastRotatedAt: new Date(),
        }),
      ),
    );

    await expect(
      rotateRefreshSession({ refreshToken: oldToken, response: createResponse() }),
    ).rejects.toMatchObject({ code: "REFRESH_CONFLICT", status: 409 });
    expect(Session.updateOne).not.toHaveBeenCalled();
  });

  test("detects later refresh-token reuse and revokes the session", async () => {
    const oldToken = signRefreshToken({ userId, sessionId });
    const oldHash = hashRefreshToken(oldToken);
    Session.findById.mockReturnValue(
      selectable(
        activeSession({
          refreshTokenHash: "new-hash",
          previousRefreshTokenHash: oldHash,
          lastRotatedAt: new Date(
            Date.now() - REFRESH_CONCURRENCY_WINDOW_MS - 1000,
          ),
        }),
      ),
    );

    await expect(
      rotateRefreshSession({ refreshToken: oldToken, response: createResponse() }),
    ).rejects.toMatchObject({ code: "REFRESH_TOKEN_REUSE" });
    expect(Session.updateOne).toHaveBeenCalledWith(
      { _id: sessionId, revokedAt: null },
      expect.objectContaining({
        $set: expect.objectContaining({ revokedReason: "refresh_token_reuse" }),
      }),
    );
  });

  test("rejects a revoked session", async () => {
    const refreshToken = signRefreshToken({ userId, sessionId });
    Session.findById.mockReturnValue(
      selectable(
        activeSession({
          refreshTokenHash: hashRefreshToken(refreshToken),
          revokedAt: new Date(),
        }),
      ),
    );

    await expect(
      rotateRefreshSession({ refreshToken, response: createResponse() }),
    ).rejects.toMatchObject({ code: "SESSION_INVALID" });
  });
});
