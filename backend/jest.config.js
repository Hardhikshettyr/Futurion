module.exports = {
  clearMocks: true,
  coverageProvider: "v8",
  setupFiles: ["<rootDir>/tests/setupEnv.js"],
  testEnvironment: "node",
  testMatch: ["**/tests/**/*.test.js"],
};
