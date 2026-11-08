jest.mock("@google/genai", () => ({
  GoogleGenAI: jest.fn(),
  ThinkingLevel: { LOW: "LOW" },
}));

const { z } = require("zod");
const { GoogleGenAI } = require("@google/genai");
const {
  generateStructuredContent,
  resetGeminiClient,
} = require("../src/services/geminiClient");

const generateContent = jest.fn();
const originalKey = process.env.GEMINI_API_KEY;
const originalModel = process.env.GEMINI_MODEL;

beforeEach(() => {
  process.env.GEMINI_API_KEY = "test-key";
  process.env.GEMINI_MODEL = "test-model";
  resetGeminiClient();
  generateContent.mockReset();
  GoogleGenAI.mockReset().mockImplementation(() => ({ models: { generateContent } }));
});

afterAll(() => {
  if (originalKey === undefined) delete process.env.GEMINI_API_KEY;
  else process.env.GEMINI_API_KEY = originalKey;
  if (originalModel === undefined) delete process.env.GEMINI_MODEL;
  else process.env.GEMINI_MODEL = originalModel;
});

test("validates structured Gemini responses with the application schema", async () => {
  generateContent.mockResolvedValue({ text: JSON.stringify({ summary: "Grounded summary" }) });
  const result = await generateStructuredContent({
    schema: z.strictObject({ summary: z.string().min(3) }),
    systemInstruction: "Return grounded JSON.",
    prompt: "Analyze known facts.",
  });
  expect(result).toEqual({ data: { summary: "Grounded summary" }, model: "test-model" });
  expect(generateContent.mock.calls[0][0]).toMatchObject({
    model: "test-model",
    config: { responseMimeType: "application/json" },
  });
});

test("rejects invalid JSON and invalid structured output", async () => {
  generateContent.mockResolvedValueOnce({ text: "not-json" });
  await expect(generateStructuredContent({
    schema: z.strictObject({ summary: z.string() }),
    systemInstruction: "safe",
    prompt: "safe",
  })).rejects.toMatchObject({ code: "AI_OUTPUT_INVALID_JSON" });

  resetGeminiClient();
  generateContent.mockResolvedValueOnce({ text: JSON.stringify({ unrelated: true }) });
  await expect(generateStructuredContent({
    schema: z.strictObject({ summary: z.string() }),
    systemInstruction: "safe",
    prompt: "safe",
  })).rejects.toMatchObject({ code: "AI_OUTPUT_INVALID_SCHEMA" });
});

test("fails safely when Gemini is not configured", async () => {
  delete process.env.GEMINI_API_KEY;
  await expect(generateStructuredContent({
    schema: z.strictObject({ summary: z.string() }),
    systemInstruction: "safe",
    prompt: "safe",
  })).rejects.toMatchObject({ code: "AI_NOT_CONFIGURED", status: 503 });
  expect(generateContent).not.toHaveBeenCalled();
});
