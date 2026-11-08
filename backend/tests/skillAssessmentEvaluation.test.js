jest.mock("../src/services/geminiClient", () => ({
  generateStructuredContent: jest.fn(),
}));

const { generateStructuredContent } = require("../src/services/geminiClient");
const {
  evaluateAssessmentAnswers,
  gradeObjectiveQuestion,
} = require("../src/services/skillAssessmentEvaluationService");

const questions = [
  {
    id: "q1",
    type: "multiple_choice",
    prompt: "Which query reads rows?",
    options: [{ id: "a", text: "SELECT" }, { id: "b", text: "DROP" }],
    correctAnswer: "a",
    referenceAnswer: "SELECT reads rows.",
    explanation: "SELECT retrieves rows.",
    rubric: [],
    maxPoints: 2,
  },
  {
    id: "q2",
    type: "short_answer",
    prompt: "Explain a primary key.",
    options: [],
    correctAnswer: "",
    referenceAnswer: "A primary key uniquely identifies each row.",
    explanation: "Uniqueness and non-null identity matter.",
    rubric: [{ criterion: "Explains unique row identity", maxPoints: 3, keywords: ["unique", "row"] }],
    maxPoints: 3,
  },
];

beforeEach(() => jest.resetAllMocks());

test("grades objective questions deterministically", () => {
  expect(gradeObjectiveQuestion(questions[0], "a")).toMatchObject({ score: 2, correct: true });
  expect(gradeObjectiveQuestion(questions[0], "b")).toMatchObject({ score: 0, correct: false });
});

test("evaluates subjective answers against the defined rubric and preserves separate results", async () => {
  generateStructuredContent.mockResolvedValue({
    model: "gemini-test",
    data: {
      evaluations: [{
        questionId: "q2",
        score: 2,
        feedback: "The answer identifies uniqueness but could mention non-null values.",
        matchedCriteria: ["Explains unique row identity"],
        areasToImprove: ["Discuss null handling."],
      }],
    },
  });
  const result = await evaluateAssessmentAnswers({ questions }, [
    { questionId: "q1", answer: "a" },
    { questionId: "q2", answer: "It uniquely identifies a row." },
  ]);
  expect(result).toMatchObject({ score: 4, maxScore: 5, percentage: 80, evaluationModel: "gemini-test" });
  expect(result.answers[1]).toMatchObject({ questionId: "q2", score: 2, correct: null });
});

test("rejects duplicate, unknown, incomplete, or over-scored AI evaluations", async () => {
  await expect(evaluateAssessmentAnswers({ questions }, [
    { questionId: "q1", answer: "a" },
    { questionId: "q1", answer: "b" },
  ])).rejects.toMatchObject({ code: "ASSESSMENT_ANSWER_DUPLICATE" });

  await expect(evaluateAssessmentAnswers({ questions }, [
    { questionId: "outside", answer: "x" },
  ])).rejects.toMatchObject({ code: "ASSESSMENT_ANSWER_INVALID" });

  generateStructuredContent.mockResolvedValueOnce({ data: { evaluations: [] }, model: "gemini-test" });
  await expect(evaluateAssessmentAnswers({ questions }, [
    { questionId: "q2", answer: "A row id" },
  ])).rejects.toMatchObject({ code: "AI_EVALUATION_INVALID" });

  generateStructuredContent.mockResolvedValueOnce({
    data: { evaluations: [{ questionId: "q2", score: 4, feedback: "Too high", matchedCriteria: [], areasToImprove: [] }] },
    model: "gemini-test",
  });
  await expect(evaluateAssessmentAnswers({ questions }, [
    { questionId: "q2", answer: "A row id" },
  ])).rejects.toMatchObject({ code: "AI_EVALUATION_INVALID" });
});
