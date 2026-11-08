const { Router } = require("express");
const {
  askCoach,
  createAnalysis,
  createAssessment,
  createLearningStrategy,
  getAiStatus,
  getAnalysis,
  getAssessments,
  getCoachConversations,
  getLearningStrategies,
  getOneAssessment,
  getOneCoachConversation,
  getOneLearningStrategy,
  patchLearningStrategy,
  submitAssessmentAnswers,
} = require("../controllers/skillAiController");
const { requireCsrf } = require("../middleware/csrfProtection");
const {
  skillAiGenerationRateLimiter,
  skillCoachRateLimiter,
} = require("../middleware/authRateLimiters");

const router = Router();

router.get("/status", getAiStatus);
router.get("/analysis", getAnalysis);
router.post("/analysis", requireCsrf, skillAiGenerationRateLimiter, createAnalysis);

router.get("/learning-strategies", getLearningStrategies);
router.post("/learning-strategies/generate", requireCsrf, skillAiGenerationRateLimiter, createLearningStrategy);
router.get("/learning-strategies/:strategyId", getOneLearningStrategy);
router.patch("/learning-strategies/:strategyId", requireCsrf, patchLearningStrategy);

router.get("/coach/conversations", getCoachConversations);
router.get("/coach/conversations/:conversationId", getOneCoachConversation);
router.post("/coach", requireCsrf, skillCoachRateLimiter, askCoach);

router.get("/assessments", getAssessments);
router.post("/assessments/generate", requireCsrf, skillAiGenerationRateLimiter, createAssessment);
router.get("/assessments/:assessmentId", getOneAssessment);
router.post("/assessments/:assessmentId/submit", requireCsrf, skillAiGenerationRateLimiter, submitAssessmentAnswers);

module.exports = router;
