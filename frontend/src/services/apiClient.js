const API_BASE_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000/api"
).replace(/\/$/, "");

let csrfToken = "";
let refreshPromise = null;

class ApiError extends Error {
  constructor(message, status, payload) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
    this.code = payload?.code;
  }
}

function readCsrfCookie() {
  const cookieName = "futurion_csrf=";
  const cookie = document.cookie
    .split(";")
    .map((value) => value.trim())
    .find((value) => value.startsWith(cookieName));
  return cookie ? decodeURIComponent(cookie.slice(cookieName.length)) : "";
}

function setCsrfToken(token) {
  csrfToken = token || "";
}

function safeErrorMessage(message, status, fallback = "Something went wrong. Please try again.") {
  if (status >= 500 || typeof message !== "string" || !message.trim()) return fallback;
  const technicalDetails = /gemini|openai|\bapi\b|mongodb|mongoose|database|stack|trace|exception|typeerror|syntaxerror|econn|enotfound|\bjwt\b|\bbson\b|model|prompt|internal server|cannot read propert/i;
  return technicalDetails.test(message) ? fallback : message;
}

async function rawRequest(path, options = {}) {
  let response;
  const headers = new Headers(options.headers || {});
  const isFormData =
    typeof FormData !== "undefined" && options.body instanceof FormData;
  if (options.body && !isFormData && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      credentials: "include",
      headers,
    });
  } catch {
    throw new ApiError(
      "We could not reach Futurion. Check your connection and try again.",
      0,
      null,
    );
  }

  const payload =
    options.responseType === "blob"
      ? await response.blob().catch(() => null)
      : await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(
      safeErrorMessage(payload?.message, response.status),
      response.status,
      payload,
    );
  }

  return payload;
}

async function ensureCsrfToken() {
  csrfToken ||= readCsrfCookie();
  if (csrfToken) return csrfToken;

  const result = await rawRequest("/auth/csrf", { method: "GET" });
  setCsrfToken(result.csrfToken);
  return csrfToken;
}

async function refreshSession() {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const token = await ensureCsrfToken();
      try {
        const result = await rawRequest("/auth/refresh", {
          method: "POST",
          headers: { "X-CSRF-Token": token },
        });
        setCsrfToken(result.csrfToken);
        return result;
      } catch (error) {
        if (error.status === 409) {
          await new Promise((resolve) => window.setTimeout(resolve, 150));
          setCsrfToken(readCsrfCookie());
          return { concurrentRefresh: true };
        }
        setCsrfToken("");
        throw error;
      }
    })().finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
}

async function apiRequest(
  path,
  {
    body,
    method = "GET",
    rawBody,
    requiresCsrf = false,
    responseType,
    retryAuth = true,
  } = {},
) {
  const headers = {};
  if (requiresCsrf) {
    headers["X-CSRF-Token"] = await ensureCsrfToken();
  }

  try {
    return await rawRequest(path, {
      method,
      headers,
      responseType,
      ...(rawBody !== undefined
        ? { body: rawBody }
        : body !== undefined
          ? { body: JSON.stringify(body) }
          : {}),
    });
  } catch (error) {
    if (error.status === 401 && retryAuth && path !== "/auth/refresh") {
      await refreshSession();
      return apiRequest(path, {
        body,
        method,
        rawBody,
        requiresCsrf,
        responseType,
        retryAuth: false,
      });
    }
    throw error;
  }
}

async function uploadRequest(path, formData, onProgress, retryAuth = true) {
  const token = await ensureCsrfToken();

  try {
    return await new Promise((resolve, reject) => {
      const request = new XMLHttpRequest();
      request.open("POST", `${API_BASE_URL}${path}`);
      request.withCredentials = true;
      request.setRequestHeader("X-CSRF-Token", token);
      request.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable && onProgress) {
          onProgress(Math.round((event.loaded / event.total) * 100));
        }
      });
      request.addEventListener("error", () => {
        reject(
          new ApiError(
            "We could not reach Futurion. Check your connection and try again.",
            0,
            null,
          ),
        );
      });
      request.addEventListener("load", () => {
        let payload = null;
        try {
          payload = JSON.parse(request.responseText);
        } catch {
          payload = null;
        }
        if (request.status >= 200 && request.status < 300) {
          resolve(payload);
        } else {
          reject(
            new ApiError(
              safeErrorMessage(payload?.message, request.status, "The upload could not be completed. Please try again."),
              request.status,
              payload,
            ),
          );
        }
      });
      request.send(formData);
    });
  } catch (error) {
    if (error.status === 401 && retryAuth) {
      await refreshSession();
      return uploadRequest(path, formData, onProgress, false);
    }
    throw error;
  }
}

export {
  ApiError,
  apiRequest,
  refreshSession,
  setCsrfToken,
  uploadRequest,
};
