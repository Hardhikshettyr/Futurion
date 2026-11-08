const EMAIL_KEY = "futurion.verificationEmail";
const RESEND_AT_KEY = "futurion.verificationResendAt";

function readSessionValue(key) {
  try {
    return window.sessionStorage.getItem(key) || "";
  } catch {
    return "";
  }
}

function writeSessionValue(key, value) {
  try {
    window.sessionStorage.setItem(key, String(value));
  } catch {
    // The verification screen remains usable when storage is unavailable.
  }
}

function getVerificationSession() {
  return {
    email: readSessionValue(EMAIL_KEY),
    resendAt: Number(readSessionValue(RESEND_AT_KEY)) || 0,
  };
}

function saveVerificationSession(email, cooldownSeconds = 0) {
  writeSessionValue(EMAIL_KEY, email);
  writeSessionValue(
    RESEND_AT_KEY,
    cooldownSeconds > 0 ? Date.now() + cooldownSeconds * 1000 : 0,
  );
}

function updateResendCooldown(cooldownSeconds) {
  writeSessionValue(RESEND_AT_KEY, Date.now() + cooldownSeconds * 1000);
}

function clearVerificationSession() {
  try {
    window.sessionStorage.removeItem(EMAIL_KEY);
    window.sessionStorage.removeItem(RESEND_AT_KEY);
  } catch {
    // No cleanup is needed when storage is unavailable.
  }
}

export {
  clearVerificationSession,
  getVerificationSession,
  saveVerificationSession,
  updateResendCooldown,
};
