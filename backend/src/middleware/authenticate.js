const Session = require("../models/Session");
const User = require("../models/User");
const {
  readAuthCookies,
  verifyAccessToken,
} = require("../services/tokenService");

async function authenticate(request, response, next) {
  const { accessToken } = readAuthCookies(request);

  if (!accessToken) {
    return response.status(401).json({
      success: false,
      code: "AUTHENTICATION_REQUIRED",
      message: "Authentication is required",
    });
  }

  try {
    const payload = verifyAccessToken(accessToken);
    const session = await Session.findOne({
      _id: payload.sid,
      userId: payload.sub,
      revokedAt: null,
      expiresAt: { $gt: new Date() },
    });

    if (!session) {
      return response.status(401).json({
        success: false,
        code: "SESSION_INVALID",
        message: "Your session is no longer active",
      });
    }

    const user = await User.findById(payload.sub).select(
      "name email role isEmailVerified isActive createdAt updatedAt",
    );

    if (!user || !user.isActive || !user.isEmailVerified) {
      return response.status(403).json({
        success: false,
        code: "ACCOUNT_UNAVAILABLE",
        message: "Your account is not available",
      });
    }

    request.auth = {
      sessionId: session._id,
      user,
      userId: user._id,
    };

    Session.updateOne(
      { _id: session._id },
      { $set: { lastUsedAt: new Date() } },
    ).catch(() => {});

    return next();
  } catch {
    return response.status(401).json({
      success: false,
      code: "ACCESS_TOKEN_INVALID",
      message: "Authentication is required",
    });
  }
}

module.exports = { authenticate };
