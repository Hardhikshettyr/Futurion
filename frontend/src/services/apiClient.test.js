import { afterEach, describe, expect, test, vi } from "vitest";

function response(payload, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue(payload),
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe("apiClient refresh coordination", () => {
  test("deduplicates simultaneous refresh requests", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(response({ success: true, csrfToken: "csrf-1" }))
      .mockResolvedValueOnce(response({ success: true, csrfToken: "csrf-2" }));
    vi.stubGlobal("fetch", fetchMock);
    const { refreshSession } = await import("./apiClient.js");

    const [first, second] = await Promise.all([
      refreshSession(),
      refreshSession(),
    ]);

    expect(first.csrfToken).toBe("csrf-2");
    expect(second).toBe(first);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1][1]).toMatchObject({
      credentials: "include",
      method: "POST",
    });
  });

  test("never reads or returns an authentication token", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(response({ success: true, csrfToken: "csrf" }))
      .mockResolvedValueOnce(
        response({ success: true, authenticated: true, user: { id: "user-1" } }),
      );
    vi.stubGlobal("fetch", fetchMock);
    const { refreshSession } = await import("./apiClient.js");
    const result = await refreshSession();

    expect(result.accessToken).toBeUndefined();
    expect(result.refreshToken).toBeUndefined();
  });

  test("refreshes once after a 401 and retries the original request", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        response({ success: false, message: "Session expired" }, 401),
      )
      .mockResolvedValueOnce(response({ success: true, csrfToken: "csrf-1" }))
      .mockResolvedValueOnce(response({ success: true, csrfToken: "csrf-2" }))
      .mockResolvedValueOnce(
        response({ success: true, user: { id: "user-1" } }),
      );
    vi.stubGlobal("fetch", fetchMock);
    const { apiRequest } = await import("./apiClient.js");

    const result = await apiRequest("/auth/me");

    expect(result.user.id).toBe("user-1");
    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      "http://localhost:5000/api/auth/me",
      "http://localhost:5000/api/auth/csrf",
      "http://localhost:5000/api/auth/refresh",
      "http://localhost:5000/api/auth/me",
    ]);
  });

  test("does not enter a refresh loop when retry authentication fails", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(response({ success: false }, 401))
      .mockResolvedValueOnce(response({ success: true, csrfToken: "csrf-1" }))
      .mockResolvedValueOnce(response({ success: true, csrfToken: "csrf-2" }))
      .mockResolvedValueOnce(response({ success: false }, 401));
    vi.stubGlobal("fetch", fetchMock);
    const { apiRequest } = await import("./apiClient.js");

    await expect(apiRequest("/auth/me")).rejects.toMatchObject({ status: 401 });
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  test("replaces internal server details with a safe message", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      response({ success: false, message: "Mongoose connection exception" }, 500),
    ));
    const { apiRequest } = await import("./apiClient.js");

    await expect(apiRequest("/progress")).rejects.toMatchObject({
      status: 500,
      message: "Something went wrong. Please try again.",
    });
  });

  test("preserves useful student-facing validation messages", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      response({ success: false, message: "Please enter a valid email address." }, 400),
    ));
    const { apiRequest } = await import("./apiClient.js");

    await expect(apiRequest("/profile")).rejects.toMatchObject({
      status: 400,
      message: "Please enter a valid email address.",
    });
  });
});
