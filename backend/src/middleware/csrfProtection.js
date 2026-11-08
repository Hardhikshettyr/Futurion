const crypto = require("node:crypto");
const jwt = require("jsonwebtoken");
const {
  readAuthCookies,
  verifyCsrfToken,
} = require("../services/tokenService");

function safeEqual(first, second) {
  if (!first || !second) return false;
  const firstBuffer = Buffer.from(first);
  const secondBuffer = Buffer.from(second);
  return (
    firstBuffer.length === secondBuffer.length &&
    crypto.timingSafeEqual(firstBuffer, secondBuffer)
  );
}

function requireCsrf(request, response, next) {
  const headerToken = request.get("x-csrf-token");
  const { accessToken, csrfToken: cookieToken, refreshToken } =
    readAuthCookies(request);

  if (!safeEqual(headerToken, cookieToken)) {
    return response.status(403).json({
      success: false,
      code: "CSRF_INVALID",
      message: "The security token is missing or invalid",
    });
  }

  const sessionIds = [accessToken, refreshToken]
    .filter(Boolean)
    .map((token) => jwt.decode(token)?.sid)
    .filter(Boolean);
  const isSessionBound = sessionIds.some((sessionId) =>
    verifyCsrfToken(headerToken, sessionId),
  );

  if (!isSessionBound) {
    return response.status(403).json({
      success: false,
      code: "CSRF_INVALID",
      message: "The security token is missing or invalid",
    });
  }

  return next();
}

module.exports = { requireCsrf };
