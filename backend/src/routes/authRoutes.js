const { Router } = require("express");
const {
  registerStudent,
  resendVerification,
  verifyEmail,
} = require("../controllers/authController");
const {
  changePassword,
  forgotPassword,
  resetPassword,
} = require("../controllers/passwordController");
const {
  getCsrfToken,
  getCurrentUser,
  listSessions,
  login,
  logout,
  logoutAll,
  refresh,
  revokeSession,
} = require("../controllers/sessionController");
const { authenticate } = require("../middleware/authenticate");
const { requireCsrf } = require("../middleware/csrfProtection");
const {
  loginRateLimiter,
  passwordRecoveryRateLimiter,
  registrationRateLimiter,
  resendRateLimiter,
  sensitiveActionRateLimiter,
  verificationRateLimiter,
} = require("../middleware/authRateLimiters");

const authRouter = Router();

authRouter.use((_request, response, next) => {
  response.set("Cache-Control", "no-store");
  next();
});

authRouter.post("/register", registrationRateLimiter, registerStudent);
authRouter.post("/verify-email", verificationRateLimiter, verifyEmail);
authRouter.post(
  "/resend-verification",
  resendRateLimiter,
  resendVerification,
);
authRouter.post("/login", loginRateLimiter, login);
authRouter.get("/csrf", getCsrfToken);
authRouter.post("/refresh", requireCsrf, refresh);
authRouter.post("/logout", requireCsrf, logout);
authRouter.post(
  "/forgot-password",
  passwordRecoveryRateLimiter,
  forgotPassword,
);
authRouter.post(
  "/reset-password",
  passwordRecoveryRateLimiter,
  resetPassword,
);

authRouter.get("/me", authenticate, getCurrentUser);
authRouter.post("/logout-all", authenticate, requireCsrf, logoutAll);
authRouter.patch(
  "/change-password",
  authenticate,
  requireCsrf,
  sensitiveActionRateLimiter,
  changePassword,
);
authRouter.get("/sessions", authenticate, listSessions);
authRouter.delete(
  "/sessions/:sessionId",
  authenticate,
  requireCsrf,
  sensitiveActionRateLimiter,
  revokeSession,
);

module.exports = authRouter;
