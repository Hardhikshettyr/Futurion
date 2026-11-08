const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function configuredOrigins() {
  return (process.env.CLIENT_URL || "http://localhost:5173")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function requireTrustedOrigin(request, response, next) {
  if (SAFE_METHODS.has(request.method)) return next();

  const origin = request.get("origin");
  if (origin && !configuredOrigins().includes(origin)) {
    return response.status(403).json({
      success: false,
      code: "ORIGIN_NOT_ALLOWED",
      message: "Request origin is not allowed",
    });
  }

  return next();
}

module.exports = { configuredOrigins, requireTrustedOrigin };
