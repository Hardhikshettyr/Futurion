const { authorizeRoles } = require("../src/middleware/authorize");
const { requireCsrf } = require("../src/middleware/csrfProtection");
const {
  createCsrfToken,
  setAuthenticationCookies,
  signAccessToken,
  signRefreshToken,
} = require("../src/services/tokenService");

const userId = "507f1f77bcf86cd799439011";
const sessionId = "507f191e810c19729de860ea";

function createResponse() {
  return {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

test("accepts a valid session-bound CSRF token", () => {
  const accessToken = signAccessToken({ userId, sessionId });
  const csrfToken = createCsrfToken(sessionId);
  const request = {
    cookies: {
      futurion_access: accessToken,
      futurion_csrf: csrfToken,
    },
    get: (name) => (name === "x-csrf-token" ? csrfToken : undefined),
  };
  const next = jest.fn();

  requireCsrf(request, createResponse(), next);
  expect(next).toHaveBeenCalledTimes(1);
});

test("accepts a refresh-bound CSRF token when the access cookie has expired", () => {
  const refreshToken = signRefreshToken({ userId, sessionId });
  const csrfToken = createCsrfToken(sessionId);
  const request = {
    cookies: {
      futurion_refresh: refreshToken,
      futurion_csrf: csrfToken,
    },
    get: (name) => (name === "x-csrf-token" ? csrfToken : undefined),
  };
  const next = jest.fn();

  requireCsrf(request, createResponse(), next);
  expect(next).toHaveBeenCalledTimes(1);
});

test("rejects a missing or mismatched CSRF token", () => {
  const response = createResponse();
  requireCsrf(
    {
      cookies: { futurion_csrf: "cookie-token" },
      get: () => "header-token",
    },
    response,
    jest.fn(),
  );
  expect(response.statusCode).toBe(403);
  expect(response.body.code).toBe("CSRF_INVALID");
});

test("prevents a student from passing an admin role check", () => {
  const response = createResponse();
  authorizeRoles("admin")(
    { auth: { user: { role: "student" } } },
    response,
    jest.fn(),
  );
  expect(response.statusCode).toBe(403);
});

test("sets HttpOnly authentication cookies and a readable CSRF cookie", () => {
  const response = { cookie: jest.fn() };
  setAuthenticationCookies(response, {
    accessToken: signAccessToken({ userId, sessionId }),
    refreshToken: signRefreshToken({ userId, sessionId }),
    sessionId,
  });

  const accessCall = response.cookie.mock.calls.find(
    ([name]) => name === "futurion_access",
  );
  const refreshCall = response.cookie.mock.calls.find(
    ([name]) => name === "futurion_refresh",
  );
  const csrfCall = response.cookie.mock.calls.find(
    ([name]) => name === "futurion_csrf",
  );
  expect(accessCall[2]).toMatchObject({ httpOnly: true, sameSite: "lax" });
  expect(refreshCall[2]).toMatchObject({
    httpOnly: true,
    path: "/api/auth",
  });
  expect(csrfCall[2]).toMatchObject({ httpOnly: false, path: "/" });
});

test("requires Secure cookies for an explicitly cross-site production setup", () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalSameSite = process.env.COOKIE_SAME_SITE;
  process.env.NODE_ENV = "production";
  process.env.COOKIE_SAME_SITE = "none";

  try {
    const response = { cookie: jest.fn() };
    setAuthenticationCookies(response, {
      accessToken: "access-token",
      refreshToken: "refresh-token",
      sessionId,
    });

    for (const [, , options] of response.cookie.mock.calls) {
      expect(options).toMatchObject({ sameSite: "none", secure: true });
    }
  } finally {
    process.env.NODE_ENV = originalNodeEnv;
    if (originalSameSite === undefined) {
      delete process.env.COOKIE_SAME_SITE;
    } else {
      process.env.COOKIE_SAME_SITE = originalSameSite;
    }
  }
});
