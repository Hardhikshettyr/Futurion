const { z } = require("zod");

const clean = (max) => z.string().trim().min(1).max(max);

const careerExploreRequestSchema = z.strictObject({ question: clean(1200) });

const careerSuggestionSchema = z.strictObject({
  careerId: clean(40),
  reasons: z.array(clean(500)).min(1).max(5),
  matchingSkills: z.array(clean(160)).max(10),
  missingSkills: z.array(clean(160)).max(10),
  educationConsiderations: z.array(clean(500)).max(6),
  nextSteps: z.array(clean(500)).max(6),
});

const careerExploreOutputSchema = z.strictObject({
  answerSummary: clean(2200),
  suggestedCareers: z.array(careerSuggestionSchema).max(8),
  uncertainties: z.array(clean(500)).max(8),
  followUpQuestions: z.array(clean(300)).max(4),
});

const careerAnalyzeOutputSchema = z.strictObject({
  careerId: clean(40),
  summary: clean(2200),
  profileMatches: z.array(clean(500)).max(10),
  preparationAreas: z.array(clean(500)).max(10),
  educationConsiderations: z.array(clean(500)).max(8),
  crossDisciplineNotes: z.array(clean(500)).max(8),
  nextSteps: z.array(clean(500)).max(8),
  uncertainties: z.array(clean(500)).max(8),
});

module.exports = {
  careerAnalyzeOutputSchema,
  careerExploreOutputSchema,
  careerExploreRequestSchema,
};
