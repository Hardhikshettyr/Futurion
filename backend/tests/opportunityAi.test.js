const AppError = require("../src/utils/AppError");
const { assertGroundedOpportunityOutput } = require("../src/services/opportunityAiService");
const { opportunityAiOutputSchema } = require("../src/validators/opportunitySchemas");

const eligibility = { requirements: [{ key: "skill:507f1f77bcf86cd799439051" }] };
const preparation = {
  roadmaps: [{ id: "507f1f77bcf86cd799439052" }],
  resources: [{ id: "507f1f77bcf86cd799439053" }],
};
const output = {
  eligibilityExplanations: [{ requirementKey: "skill:507f1f77bcf86cd799439051", explanation: "Recorded result" }],
  missingRequirementActions: [],
  preparationSteps: [{ roadmapId: "507f1f77bcf86cd799439052", resourceIds: ["507f1f77bcf86cd799439053"] }],
};

test("accepts only eligibility, roadmap and resource identifiers from retrieved context", () => {
  expect(() => assertGroundedOpportunityOutput(output, eligibility, preparation)).not.toThrow();
  expect(() => assertGroundedOpportunityOutput({ ...output, eligibilityExplanations: [{ requirementKey: "invented" }] }, eligibility, preparation)).toThrow(AppError);
  expect(() => assertGroundedOpportunityOutput({ ...output, preparationSteps: [{ roadmapId: null, resourceIds: ["507f1f77bcf86cd799439099"] }] }, eligibility, preparation)).toThrow(/outside the verified library context/i);
});

test("rejects malformed structured AI output before it can reach the client", () => {
  const parsed = opportunityAiOutputSchema.safeParse({ summary: "Unstructured answer", preparationSteps: [{ inventedUrl: "https://fake.example" }] });
  expect(parsed.success).toBe(false);
});
