const bcrypt = require("bcrypt");
const Session = require("../models/Session");
const User = require("../models/User");
const {
  AuthenticationError,
  clearSessionCookies,
  createSession,
  issueCsrfForRequest,
  revokeAllUserSessions,
  revokeSessionFromToken,
  rotateRefreshSession,
} = require("../services/sessionService");
const { readAuthCookies } = require("../services/tokenService");
const { loginSchema, sessionIdSchema } = require("../validators/authSchemas");
const { toSafeUser } = require("../utils/userPresenter");
const { validateRequest } = require("../utils/validation");

const DUMMY_PASSWORD_HASH =
  "$2b$12$GE4nIkAubJCU9AIbVb8yhuAoZsHwRH4czqrjJOpXwGwuZJ5fjZPwW";

function authenticationErrorResponse(error, response) {
  const status = error instanceof AuthenticationError ? error.status : 401;
  return response.status(status).json({
    success: false,
    code: error.code || "AUTHENTICATION_FAILED",
    message:
      status === 409
        ? "Another session refresh is already in progress"
        : "Your session is invalid or has expired",
  });
}

async function login(request, response, next) {
  const validation = validateRequest(loginSchema, request.body);
  if (validation.errors) {
    return response.status(400).json({
      success: false,
      message: "Validation failed",
      errors: validation.errors,
    });
  }

  try {
    const user = await User.findOne({ email: validation.data.email }).select(
      "+password",
    );
    const passwordMatches = user
      ? await user.comparePassword(validation.data.password)
      : await bcrypt.compare(validation.data.password, DUMMY_PASSWORD_HASH);

    if (!user || !passwordMatches) {
      return response.status(401).json({
        success: false,
        code: "INVALID_CREDENTIALS",
        message: "Email or password is incorrect",
      });
    }
    if (!user.isEmailVerified) {
      return response.status(403).json({
        success: false,
        code: "EMAIL_NOT_VERIFIED",
        message: "Verify your email before signing in",
      });
    }
    if (!user.isActive) {
      return response.status(403).json({
        success: false,
        code: "ACCOUNT_INACTIVE",
        message: "This account is currently unavailable",
      });
    }

    const { csrfToken } = await createSession({ user, request, response });
    return response.status(200).json({
      success: true,
      message: "Signed in successfully",
      authenticated: true,
      csrfToken,
      user: toSafeUser(user),
    });
  } catch (error) {
    return next(error);
  }
}

async function refresh(request, response) {
  const { refreshToken } = readAuthCookies(request);
  if (!refreshToken) {
    clearSessionCookies(response);
    return response.status(401).json({
      success: false,
      code: "REFRESH_TOKEN_MISSING",
      message: "Your session has expired",
    });
  }

  try {
    const { csrfToken, user } = await rotateRefreshSession({
      refreshToken,
      response,
    });
    return response.status(200).json({
      success: true,
      authenticated: true,
      csrfToken,
      user: toSafeUser(user),
    });
  } catch (error) {
    if (error.code !== "REFRESH_CONFLICT") clearSessionCookies(response);
    return authenticationErrorResponse(error, response);
  }
}

async function getCsrfToken(request, response) {
  const { accessToken, refreshToken } = readAuthCookies(request);
  try {
    const csrfToken = await issueCsrfForRequest({
      accessToken,
      refreshToken,
      response,
    });
    return response.status(200).json({ success: true, csrfToken });
  } catch (error) {
    return authenticationErrorResponse(error, response);
  }
}

async function logout(request, response) {
  const { refreshToken } = readAuthCookies(request);
  await revokeSessionFromToken(refreshToken);
  clearSessionCookies(response);
  return response.status(200).json({
    success: true,
    message: "Signed out successfully",
  });
}

async function logoutAll(request, response, next) {
  try {
    await revokeAllUserSessions(request.auth.userId);
    clearSessionCookies(response);
    return response.status(200).json({
      success: true,
      message: "Signed out from all devices",
    });
  } catch (error) {
    return next(error);
  }
}

function getCurrentUser(request, response) {
  return response.status(200).json({
    success: true,
    authenticated: true,
    user: toSafeUser(request.auth.user),
  });
}

function describeDevice(userAgent) {
  if (/iphone|ipad/i.test(userAgent)) return "Safari on iOS";
  if (/android/i.test(userAgent)) return "Browser on Android";
  if (/edg\//i.test(userAgent)) return "Microsoft Edge";
  if (/firefox\//i.test(userAgent)) return "Mozilla Firefox";
  if (/chrome\//i.test(userAgent)) return "Google Chrome";
  if (/safari\//i.test(userAgent)) return "Safari";
  return "Unknown browser";
}

async function listSessions(request, response, next) {
  try {
    const sessions = await Session.find({
      userId: request.auth.userId,
      revokedAt: null,
      expiresAt: { $gt: new Date() },
    }).sort({ lastUsedAt: -1 });

    return response.status(200).json({
      success: true,
      sessions: sessions.map((session) => ({
        id: session._id.toString(),
        device: describeDevice(session.userAgent),
        userAgent: session.userAgent,
        createdAt: session.createdAt,
        lastUsedAt: session.lastUsedAt,
        current: session._id.equals(request.auth.sessionId),
      })),
    });
  } catch (error) {
    return next(error);
  }
}

async function revokeSession(request, response, next) {
  const parsedSessionId = sessionIdSchema.safeParse(request.params.sessionId);
  if (!parsedSessionId.success) {
    return response.status(400).json({
      success: false,
      message: "Invalid session ID",
    });
  }

  try {
    const session = await Session.findOneAndUpdate(
      {
        _id: parsedSessionId.data,
        userId: request.auth.userId,
        revokedAt: null,
      },
      { $set: { revokedAt: new Date(), revokedReason: "user_revoked" } },
      { returnDocument: "after" },
    );

    if (!session) {
      return response.status(404).json({
        success: false,
        message: "Session was not found",
      });
    }

    const current = session._id.equals(request.auth.sessionId);
    if (current) clearSessionCookies(response);
    return response.status(200).json({
      success: true,
      message: "Session revoked",
      currentSessionRevoked: current,
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getCsrfToken,
  getCurrentUser,
  listSessions,
  login,
  logout,
  logoutAll,
  refresh,
  revokeSession,
};
