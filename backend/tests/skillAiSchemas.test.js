const {
  assessmentOutputSchema,
  coachOutputSchema,
  learningStrategyOutputSchema,
  skillAnalysisOutputSchema,
} = require("../src/validators/skillAiSchemas");

test("AI analysis requires a complete grounded structure", () => {
  expect(skillAnalysisOutputSchema.safeParse({ summary: "Improve your skills." }).success).toBe(false);
  const insight = { title: "SQL", explanation: "Evidence is absent.", basis: [], suggestedAction: "Attach evidence." };
  expect(skillAnalysisOutputSchema.safeParse({
    summary: "Recorded SQL has limited evidence.",
    strongestAreas: [], needsImprovement: [insight], insufficientEvidence: [], missingCompetencies: [], learningPriorities: [], nextSteps: [], strengthsToBuildUpon: [], dataLimitations: [],
  }).success).toBe(false);
});

test("learning strategies reject fabricated URL fields through strict validation", () => {
  const result = learningStrategyOutputSchema.safeParse({
    title: "SQL plan",
    learningObjective: "Build SQL practice.",
    prerequisites: [],
    stages: [{ order: 1, title: "Start", objective: "Learn queries.", topics: ["SELECT"], practicalExercises: ["Write a query."], completionCriteria: ["Query works."] }],
    suggestedProjects: [],
    resourceRecommendations: [{ resourceId: "x", title: "Unknown", reason: "Unknown", url: "https://invented.example" }],
    howToDemonstrate: ["Show a query."],
    completionCriteria: ["Explain a query."],
    assumptions: [],
  });
  expect(result.success).toBe(false);
});

test("assessment validation rejects inconsistent objective answers and rubric totals", () => {
  const base = {
    title: "SQL check",
    instructions: ["Answer all."],
    questions: [1, 2, 3].map((number) => ({
      id: `q${number}`,
      type: "multiple_choice",
      prompt: "Choose an answer.",
      options: [{ id: "a", text: "A" }, { id: "b", text: "B" }],
      correctAnswer: "outside",
      referenceAnswer: "A",
      explanation: "A is correct.",
      rubric: [],
      maxPoints: 2,
    })),
  };
  expect(assessmentOutputSchema.safeParse(base).success).toBe(false);
});

test("coach output separates facts, suggestions, and unavailable information", () => {
  expect(coachOutputSchema.safeParse({
    answer: "Your SQL record is self-declared.",
    knownFacts: [{ statement: "SQL is self-declared.", source: "StudentSkill" }],
    suggestions: [{ statement: "Attach a project.", rationale: "It can demonstrate applied work." }],
    unavailableInformation: ["No assessment result is recorded."],
    followUpQuestions: [],
  }).success).toBe(true);
});
