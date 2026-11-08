const express = require("express");
const request = require("supertest");
const { createAuthRateLimiter } = require("../src/middleware/authRateLimiters");

const originalNodeEnv = process.env.NODE_ENV;

afterAll(() => {
  process.env.NODE_ENV = originalNodeEnv;
});

test("AI request limiter returns a safe 429 response after the configured limit", async () => {
  process.env.NODE_ENV = "development";
  const app = express();
  app.get("/limited", createAuthRateLimiter({
    windowMs: 60_000,
    limit: 1,
    message: "Too many AI requests. Please try again later.",
  }), (_request, response) => response.json({ success: true }));

  await request(app).get("/limited").expect(200);
  const response = await request(app).get("/limited").expect(429);
  expect(response.body).toEqual({
    success: false,
    message: "Too many AI requests. Please try again later.",
  });
});
