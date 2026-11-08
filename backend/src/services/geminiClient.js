const { GoogleGenAI, ThinkingLevel } = require("@google/genai");
const { z } = require("zod");
const AppError = require("../utils/AppError");

const DEFAULT_TIMEOUT_MS = 60_000;
const MAX_ATTEMPTS = 2;
const RETRY_DELAY_MS = 500;
const UNSUPPORTED_SCHEMA_KEYS = new Set([
  "$schema",
  "const",
  "default",
  "exclusiveMaximum",
  "exclusiveMinimum",
  "maxItems",
  "maxLength",
  "minLength",
  "multipleOf",
  "pattern",
  "uniqueItems",
]);

let cachedClient = null;
let cachedApiKey = "";

function getGeminiConfiguration() {
  const apiKey = process.env.GEMINI_API_KEY?.trim() || "";
  const model = process.env.GEMINI_MODEL?.trim() || "";
  const parsedTimeout = Number(process.env.GEMINI_TIMEOUT_MS);
  return {
    apiKey,
    model,
    available: Boolean(apiKey && model),
    timeoutMs: Number.isFinite(parsedTimeout) && parsedTimeout > 0
      ? parsedTimeout
      : DEFAULT_TIMEOUT_MS,
  };
}

function getGeminiClient(apiKey) {
  if (!cachedClient || cachedApiKey !== apiKey) {
    cachedClient = new GoogleGenAI({ apiKey });
    cachedApiKey = apiKey;
  }
  return cachedClient;
}

function resetGeminiClient() {
  cachedClient = null;
  cachedApiKey = "";
}

function sanitizeJsonSchema(value) {
  if (Array.isArray(value)) return value.map(sanitizeJsonSchema);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !UNSUPPORTED_SCHEMA_KEYS.has(key))
      .map(([key, nested]) => [key, sanitizeJsonSchema(nested)]),
  );
}

function zodJsonSchema(schema) {
  return sanitizeJsonSchema(z.toJSONSchema(schema));
}

function mapGeminiError(error) {
  if (error instanceof AppError) return error;
  const status = Number(error?.status || error?.code);
  const message = String(error?.message || "").toLowerCase();
  if (status === 429 || message.includes("rate limit") || message.includes("quota")) {
    return new AppError(429, "AI_RATE_LIMITED", "Futurion AI is busy right now. Please try again later.");
  }
  if (status === 401 || status === 403 || message.includes("api key")) {
    return new AppError(503, "AI_CONFIGURATION_INVALID", "Futurion AI is currently unavailable.");
  }
  if (
    status === 504 ||
    error?.name === "AbortError" ||
    message.includes("timeout") ||
    message.includes("timed out") ||
    message.includes("deadline")
  ) {
    return new AppError(504, "AI_TIMEOUT", "Futurion AI took too long. Please try again.");
  }
  return new AppError(503, "AI_UNAVAILABLE", "Futurion AI is currently unavailable.");
}

function isTransient(error) {
  const status = Number(error?.status || error?.code);
  const message = String(error?.message || "").toLowerCase();
  return [429, 503, 504].includes(status) || message.includes("high demand") || message.includes("temporarily unavailable");
}

function wait(delayMs) {
  return new Promise((resolve) => setTimeout(resolve, delayMs));
}

async function invokeWithRetry(callback) {
  let lastError;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      return await callback();
    } catch (error) {
      lastError = error;
      if (!isTransient(error) || attempt === MAX_ATTEMPTS) throw error;
      await wait(RETRY_DELAY_MS);
    }
  }
  throw lastError;
}

async function generateStructuredContent({
  schema,
  systemInstruction,
  prompt,
  maxOutputTokens = 8192,
  temperature = 0.2,
}) {
  const configuration = getGeminiConfiguration();
  if (!configuration.available) {
    throw new AppError(
      503,
      "AI_NOT_CONFIGURED",
      "Futurion AI is not configured. Non-AI tools remain available.",
    );
  }

  try {
    const client = getGeminiClient(configuration.apiKey);
    const response = await invokeWithRetry(() => client.models.generateContent({
      model: configuration.model,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        httpOptions: { timeout: configuration.timeoutMs },
        maxOutputTokens,
        responseJsonSchema: zodJsonSchema(schema),
        responseMimeType: "application/json",
        systemInstruction,
        temperature,
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      },
    }));

    let parsed;
    try {
      parsed = JSON.parse(response.text || "");
    } catch {
      throw new AppError(502, "AI_OUTPUT_INVALID_JSON", "The AI returned an unreadable response. Please regenerate it.");
    }
    const validation = schema.safeParse(parsed);
    if (!validation.success) {
      throw new AppError(502, "AI_OUTPUT_INVALID_SCHEMA", "The AI response did not pass Futurion's safety checks. Please regenerate it.");
    }
    return { data: validation.data, model: configuration.model };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw mapGeminiError(error);
  }
}

module.exports = {
  generateStructuredContent,
  getGeminiClient,
  getGeminiConfiguration,
  invokeWithRetry,
  mapGeminiError,
  resetGeminiClient,
  sanitizeJsonSchema,
  zodJsonSchema,
};
