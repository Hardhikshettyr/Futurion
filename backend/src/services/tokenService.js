const crypto = require("node:crypto");
const jwt = require("jsonwebtoken");
const { getAuthConfiguration } = require("../config/auth");

function hashRefreshToken(token) {
  const { refreshSecret } = getAuthConfiguration();
  return crypto.createHmac("sha256", refreshSecret).update(token).digest("hex");
}

function signAccessToken({ userId, sessionId }) {
  const config = getAuthConfiguration();
  return jwt.sign(
    { type: "access", sid: sessionId.toString() },
    config.accessSecret,
    {
      algorithm: "HS256",
      audience: config.audience,
      expiresIn: config.accessExpiresIn,
      issuer: config.issuer,
      subject: userId.toString(),
      jwtid: crypto.randomUUID(),
    },
  );
}

function signRefreshToken({ userId, sessionId }) {
  const config = getAuthConfiguration();
  return jwt.sign(
    { type: "refresh", sid: sessionId.toString() },
    config.refreshSecret,
    {
      algorithm: "HS256",
      audience: config.audience,
      expiresIn: config.refreshExpiresIn,
      issuer: config.issuer,
      subject: userId.toString(),
      jwtid: crypto.randomUUID(),
    },
  );
}

function verifyToken(token, type, options = {}) {
  const config = getAuthConfiguration();
  const secret = type === "access" ? config.accessSecret : config.refreshSecret;
  const payload = jwt.verify(token, secret, {
    algorithms: ["HS256"],
    audience: config.audience,
    ignoreExpiration: Boolean(options.ignoreExpiration),
    issuer: config.issuer,
  });

  if (payload.type !== type || !payload.sid || !payload.sub) {
    throw new Error(`Invalid ${type} token claims`);
  }

  return payload;
}

function verifyAccessToken(token) {
  return verifyToken(token, "access");
}

function verifyRefreshToken(token, options) {
  return verifyToken(token, "refresh", options);
}

function cookieBaseOptions() {
  const config = getAuthConfiguration();
  return {
    domain: config.cookieDomain,
    sameSite: config.sameSite,
    secure: config.secure,
  };
}

function createCsrfToken(sessionId) {
  const { csrfSecret } = getAuthConfiguration();
  const nonce = crypto.randomBytes(24).toString("base64url");
  const signature = crypto
    .createHmac("sha256", csrfSecret)
    .update(`${sessionId.toString().length}!${sessionId}!${nonce.length}!${nonce}`)
    .digest("base64url");
  return `${nonce}.${signature}`;
}

function verifyCsrfToken(token, sessionId) {
  if (!token || !sessionId) return false;
  const [nonce, suppliedSignature, extra] = token.split(".");
  if (!nonce || !suppliedSignature || extra) return false;

  const expected = createCsrfSignature(sessionId, nonce);
  const suppliedBuffer = Buffer.from(suppliedSignature);
  const expectedBuffer = Buffer.from(expected);
  return (
    suppliedBuffer.length === expectedBuffer.length &&
    crypto.timingSafeEqual(suppliedBuffer, expectedBuffer)
  );
}

function createCsrfSignature(sessionId, nonce) {
  const { csrfSecret } = getAuthConfiguration();
  return crypto
    .createHmac("sha256", csrfSecret)
    .update(`${sessionId.toString().length}!${sessionId}!${nonce.length}!${nonce}`)
    .digest("base64url");
}

function setAuthenticationCookies(response, { accessToken, refreshToken, sessionId }) {
  const config = getAuthConfiguration();
  const base = cookieBaseOptions();

  response.cookie(config.accessCookieName, accessToken, {
    ...base,
    httpOnly: true,
    maxAge: config.accessMaxAgeMs,
    path: "/api",
  });
  response.cookie(config.refreshCookieName, refreshToken, {
    ...base,
    httpOnly: true,
    maxAge: config.refreshMaxAgeMs,
    path: "/api/auth",
  });
  return setCsrfCookie(response, sessionId);
}

function setCsrfCookie(response, sessionId) {
  const config = getAuthConfiguration();
  const base = cookieBaseOptions();
  const csrfToken = createCsrfToken(sessionId);

  response.cookie(config.csrfCookieName, csrfToken, {
    ...base,
    httpOnly: false,
    maxAge: config.refreshMaxAgeMs,
    path: "/",
  });

  return csrfToken;
}

function clearAuthenticationCookies(response) {
  const config = getAuthConfiguration();
  const base = cookieBaseOptions();
  response.clearCookie(config.accessCookieName, {
    ...base,
    httpOnly: true,
    path: "/api",
  });
  response.clearCookie(config.refreshCookieName, {
    ...base,
    httpOnly: true,
    path: "/api/auth",
  });
  response.clearCookie(config.csrfCookieName, {
    ...base,
    httpOnly: false,
    path: "/",
  });
}

function readAuthCookies(request) {
  const config = getAuthConfiguration();
  return {
    accessToken: request.cookies?.[config.accessCookieName],
    csrfToken: request.cookies?.[config.csrfCookieName],
    refreshToken: request.cookies?.[config.refreshCookieName],
  };
}

module.exports = {
  clearAuthenticationCookies,
  createCsrfToken,
  hashRefreshToken,
  readAuthCookies,
  setAuthenticationCookies,
  setCsrfCookie,
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyCsrfToken,
  verifyRefreshToken,
};
