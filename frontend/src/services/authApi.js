import { apiRequest, setCsrfToken } from "./apiClient.js";

function registerStudent(details) {
  return apiRequest("/auth/register", {
    body: details,
    method: "POST",
    retryAuth: false,
  });
}

function verifyStudentEmail(details) {
  return apiRequest("/auth/verify-email", {
    body: details,
    method: "POST",
    retryAuth: false,
  });
}

function resendVerificationEmail(email) {
  return apiRequest("/auth/resend-verification", {
    body: { email },
    method: "POST",
    retryAuth: false,
  });
}

async function loginUser(credentials) {
  const result = await apiRequest("/auth/login", {
    body: credentials,
    method: "POST",
    retryAuth: false,
  });
  setCsrfToken(result.csrfToken);
  return result;
}

function getCurrentUser() {
  return apiRequest("/auth/me");
}

async function logoutUser() {
  try {
    return await apiRequest("/auth/logout", {
      method: "POST",
      requiresCsrf: true,
      retryAuth: false,
    });
  } finally {
    setCsrfToken("");
  }
}

async function logoutAllDevices() {
  try {
    return await apiRequest("/auth/logout-all", {
      method: "POST",
      requiresCsrf: true,
    });
  } finally {
    setCsrfToken("");
  }
}

function requestPasswordReset(email) {
  return apiRequest("/auth/forgot-password", {
    body: { email },
    method: "POST",
    retryAuth: false,
  });
}

function resetPassword(details) {
  return apiRequest("/auth/reset-password", {
    body: details,
    method: "POST",
    retryAuth: false,
  });
}

async function changePassword(details) {
  const result = await apiRequest("/auth/change-password", {
    body: details,
    method: "PATCH",
    requiresCsrf: true,
  });
  if (result.csrfToken) setCsrfToken(result.csrfToken);
  return result;
}

function getSessions() {
  return apiRequest("/auth/sessions");
}

function revokeSession(sessionId) {
  return apiRequest(`/auth/sessions/${sessionId}`, {
    method: "DELETE",
    requiresCsrf: true,
  });
}

export {
  changePassword,
  getCurrentUser,
  getSessions,
  loginUser,
  logoutAllDevices,
  logoutUser,
  registerStudent,
  requestPasswordReset,
  resendVerificationEmail,
  resetPassword,
  revokeSession,
  verifyStudentEmail,
};
