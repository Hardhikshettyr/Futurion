const DEFAULT_ACCESS_EXPIRY = "15m";
const DEFAULT_REFRESH_EXPIRY = "7d";

function requireSecret(name) {
  const value = process.env[name];

  if (!value || value.length < 32) {
    throw new Error(`${name} must contain at least 32 characters`);
  }

  return value;
}

function parseDuration(duration) {
  const match = String(duration).match(/^(\d+)(s|m|h|d)$/);

  if (!match) {
    throw new Error(`Invalid token duration: ${duration}`);
  }

  const value = Number(match[1]);
  const multipliers = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  return value * multipliers[match[2]];
}

function getAuthConfiguration() {
  const accessExpiresIn =
    process.env.JWT_ACCESS_EXPIRES_IN || DEFAULT_ACCESS_EXPIRY;
  const refreshExpiresIn =
    process.env.JWT_REFRESH_EXPIRES_IN || DEFAULT_REFRESH_EXPIRY;
  const secure = process.env.NODE_ENV === "production";
  const sameSite = (process.env.COOKIE_SAME_SITE || "lax").toLowerCase();

  if (!["strict", "lax", "none"].includes(sameSite)) {
    throw new Error("COOKIE_SAME_SITE must be strict, lax, or none");
  }

  if (sameSite === "none" && !secure) {
    throw new Error(
      "COOKIE_SAME_SITE=none requires NODE_ENV=production and Secure cookies",
    );
  }

  return {
    accessCookieName: process.env.ACCESS_COOKIE_NAME || "futurion_access",
    accessExpiresIn,
    accessMaxAgeMs: parseDuration(accessExpiresIn),
    accessSecret: requireSecret("JWT_ACCESS_SECRET"),
    cookieDomain: process.env.COOKIE_DOMAIN || undefined,
    csrfCookieName: process.env.CSRF_COOKIE_NAME || "futurion_csrf",
    csrfSecret: requireSecret("CSRF_SECRET"),
    issuer: "futurion-api",
    audience: "futurion-web",
    refreshCookieName: process.env.REFRESH_COOKIE_NAME || "futurion_refresh",
    refreshExpiresIn,
    refreshMaxAgeMs: parseDuration(refreshExpiresIn),
    refreshSecret: requireSecret("JWT_REFRESH_SECRET"),
    sameSite,
    secure,
  };
}

function validateAuthenticationConfiguration() {
  getAuthConfiguration();
  requireSecret("PASSWORD_RESET_OTP_SECRET");
}

module.exports = {
  getAuthConfiguration,
  parseDuration,
  requireSecret,
  validateAuthenticationConfiguration,
};
