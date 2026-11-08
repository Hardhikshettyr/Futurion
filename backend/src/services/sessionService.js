const crypto = require("node:crypto");
const { getAuthConfiguration } = require("../config/auth");
const Session = require("../models/Session");
const User = require("../models/User");
const {
  clearAuthenticationCookies,
  hashRefreshToken,
  setAuthenticationCookies,
  setCsrfCookie,
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} = require("./tokenService");

const REFRESH_CONCURRENCY_WINDOW_MS = 5000;

class AuthenticationError extends Error {
  constructor(code, message, status = 401) {
    super(message);
    this.name = "AuthenticationError";
    this.code = code;
    this.status = status;
  }
}

function hashesMatch(first, second) {
  if (!first || !second) return false;
  const firstBuffer = Buffer.from(first);
  const secondBuffer = Buffer.from(second);
  return (
    firstBuffer.length === secondBuffer.length &&
    crypto.timingSafeEqual(firstBuffer, secondBuffer)
  );
}

function getClientMetadata(request) {
  return {
    ipAddress: request.ip || request.socket?.remoteAddress || null,
    userAgent: String(request.get("user-agent") || "Unknown device").slice(
      0,
      500,
    ),
  };
}

function assertActiveSession(session) {
  if (!session || session.revokedAt || session.expiresAt <= new Date()) {
    throw new AuthenticationError(
      "SESSION_INVALID",
      "Your session is no longer active",
    );
  }
}

async function createSession({ user, request, response }) {
  const config = getAuthConfiguration();
  const now = new Date();
  const session = new Session({
    userId: user._id,
    refreshTokenHash: "pending",
    expiresAt: new Date(now.getTime() + config.refreshMaxAgeMs),
    lastUsedAt: now,
    ...getClientMetadata(request),
  });
  const refreshToken = signRefreshToken({
    userId: user._id,
    sessionId: session._id,
  });
  session.refreshTokenHash = hashRefreshToken(refreshToken);
  await session.save();

  const accessToken = signAccessToken({
    userId: user._id,
    sessionId: session._id,
  });
  const csrfToken = setAuthenticationCookies(response, {
    accessToken,
    refreshToken,
    sessionId: session._id,
  });

  return { csrfToken, session };
}

async function revokeForReuse(sessionId) {
  await Session.updateOne(
    { _id: sessionId, revokedAt: null },
    { $set: { revokedAt: new Date(), revokedReason: "refresh_token_reuse" } },
  );
}

async function handleRefreshMismatch(session, presentedHash) {
  const isImmediateConcurrentRequest =
    hashesMatch(session.previousRefreshTokenHash, presentedHash) &&
    session.lastRotatedAt &&
    Date.now() - session.lastRotatedAt.getTime() <=
      REFRESH_CONCURRENCY_WINDOW_MS;

  if (isImmediateConcurrentRequest) {
    throw new AuthenticationError(
      "REFRESH_CONFLICT",
      "A refresh is already in progress",
      409,
    );
  }

  await revokeForReuse(session._id);
  throw new AuthenticationError(
    "REFRESH_TOKEN_REUSE",
    "The session was revoked for security",
  );
}

async function rotateRefreshSession({ refreshToken, response }) {
  let payload;

  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw new AuthenticationError(
      "REFRESH_TOKEN_INVALID",
      "Your session could not be refreshed",
    );
  }

  let session = await Session.findById(payload.sid).select(
    "+refreshTokenHash +previousRefreshTokenHash",
  );
  assertActiveSession(session);

  const presentedHash = hashRefreshToken(refreshToken);
  if (!hashesMatch(session.refreshTokenHash, presentedHash)) {
    return handleRefreshMismatch(session, presentedHash);
  }

  const user = await User.findById(payload.sub).select(
    "name email role isEmailVerified isActive createdAt",
  );
  if (!user || !user.isActive || !user.isEmailVerified) {
    await Session.updateOne(
      { _id: session._id },
      { $set: { revokedAt: new Date(), revokedReason: "account_unavailable" } },
    );
    throw new AuthenticationError(
      "ACCOUNT_UNAVAILABLE",
      "Your account is not available",
      403,
    );
  }

  const nextRefreshToken = signRefreshToken({
    userId: user._id,
    sessionId: session._id,
  });
  const nextRefreshHash = hashRefreshToken(nextRefreshToken);
  const now = new Date();
  session = await Session.findOneAndUpdate(
    {
      _id: session._id,
      refreshTokenHash: presentedHash,
      revokedAt: null,
      expiresAt: { $gt: now },
    },
    {
      $set: {
        lastRotatedAt: now,
        lastUsedAt: now,
        previousRefreshTokenHash: presentedHash,
        refreshTokenHash: nextRefreshHash,
      },
    },
    { returnDocument: "after" },
  ).select("+refreshTokenHash +previousRefreshTokenHash");

  if (!session) {
    const currentSession = await Session.findById(payload.sid).select(
      "+refreshTokenHash +previousRefreshTokenHash",
    );
    assertActiveSession(currentSession);
    return handleRefreshMismatch(currentSession, presentedHash);
  }

  const accessToken = signAccessToken({
    userId: user._id,
    sessionId: session._id,
  });
  const csrfToken = setAuthenticationCookies(response, {
    accessToken,
    refreshToken: nextRefreshToken,
    sessionId: session._id,
  });

  return { csrfToken, user };
}

async function rotateCurrentSession({ sessionId, userId, response }) {
  const session = await Session.findOne({
    _id: sessionId,
    userId,
    revokedAt: null,
    expiresAt: { $gt: new Date() },
  }).select("+refreshTokenHash");
  assertActiveSession(session);

  const nextRefreshToken = signRefreshToken({ userId, sessionId });
  const nextRefreshHash = hashRefreshToken(nextRefreshToken);
  const now = new Date();
  await Session.updateOne(
    { _id: sessionId, revokedAt: null },
    {
      $set: {
        lastRotatedAt: now,
        lastUsedAt: now,
        previousRefreshTokenHash: session.refreshTokenHash,
        refreshTokenHash: nextRefreshHash,
      },
    },
  );

  const accessToken = signAccessToken({ userId, sessionId });
  return setAuthenticationCookies(response, {
    accessToken,
    refreshToken: nextRefreshToken,
    sessionId,
  });
}

async function revokeSessionFromToken(refreshToken) {
  if (!refreshToken) return;
  try {
    const payload = verifyRefreshToken(refreshToken, { ignoreExpiration: true });
    await Session.updateOne(
      { _id: payload.sid, userId: payload.sub, revokedAt: null },
      { $set: { revokedAt: new Date(), revokedReason: "logout" } },
    );
  } catch {
    // Logout remains idempotent for absent, expired, or malformed cookies.
  }
}

async function revokeAllUserSessions(userId, reason = "logout_all") {
  return Session.updateMany(
    { userId, revokedAt: null },
    { $set: { revokedAt: new Date(), revokedReason: reason } },
  );
}

async function revokeOtherUserSessions(userId, currentSessionId) {
  return Session.updateMany(
    { userId, _id: { $ne: currentSessionId }, revokedAt: null },
    { $set: { revokedAt: new Date(), revokedReason: "password_changed" } },
  );
}

async function issueCsrfForRequest({ accessToken, refreshToken, response }) {
  let payload;
  try {
    if (accessToken) {
      try {
        payload = verifyAccessToken(accessToken);
      } catch {
        payload = verifyRefreshToken(refreshToken);
      }
    } else {
      payload = verifyRefreshToken(refreshToken);
    }
  } catch {
    throw new AuthenticationError(
      "SESSION_INVALID",
      "No active session is available",
    );
  }

  const session = await Session.findOne({
    _id: payload.sid,
    userId: payload.sub,
    revokedAt: null,
    expiresAt: { $gt: new Date() },
  });
  assertActiveSession(session);
  return setCsrfCookie(response, session._id);
}

function clearSessionCookies(response) {
  clearAuthenticationCookies(response);
}

module.exports = {
  AuthenticationError,
  REFRESH_CONCURRENCY_WINDOW_MS,
  clearSessionCookies,
  createSession,
  getClientMetadata,
  issueCsrfForRequest,
  revokeAllUserSessions,
  revokeOtherUserSessions,
  revokeSessionFromToken,
  rotateCurrentSession,
  rotateRefreshSession,
};
