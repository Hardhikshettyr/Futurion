process.env.NODE_ENV = "test";
process.env.CLIENT_URL = "http://localhost:5173";
process.env.SMTP_HOST = "smtp.example.test";
process.env.SMTP_PORT = "587";
process.env.SMTP_USER = "test-user";
process.env.SMTP_PASS = "test-password";
process.env.EMAIL_FROM = "Futurion <test@example.com>";
process.env.OTP_HASH_SECRET =
  "test-verification-secret-at-least-thirty-two-characters";
process.env.PASSWORD_RESET_OTP_SECRET =
  "test-password-reset-secret-at-least-thirty-two-characters";
process.env.JWT_ACCESS_SECRET =
  "test-access-secret-at-least-thirty-two-characters";
process.env.JWT_REFRESH_SECRET =
  "test-refresh-secret-at-least-thirty-two-characters";
process.env.CSRF_SECRET = "test-csrf-secret-at-least-thirty-two-characters";
process.env.JWT_ACCESS_EXPIRES_IN = "15m";
process.env.JWT_REFRESH_EXPIRES_IN = "7d";
