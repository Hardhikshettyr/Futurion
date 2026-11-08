const { Router } = require("express");
const { analyzePreview, analyzeSaved, compare, create, detail, duplicate, list, remove, update } = require("../controllers/careerScenarioController");
const { authenticate } = require("../middleware/authenticate");
const { authorizeRoles } = require("../middleware/authorize");
const { requireCsrf } = require("../middleware/csrfProtection");
const { scenarioInsights } = require("../controllers/careerDecisionAiController");
const { careerDecisionAiRateLimiter } = require("../middleware/authRateLimiters");

const router = Router();
router.use(authenticate, authorizeRoles("student"));
router.use((_request, response, next) => { response.set("Cache-Control", "no-store"); next(); });
router.get("/", list);
router.post("/ai-insights", requireCsrf, careerDecisionAiRateLimiter, scenarioInsights);
router.post("/analyze", requireCsrf, analyzePreview);
router.post("/compare", requireCsrf, compare);
router.post("/", requireCsrf, create);
router.get("/:scenarioId", detail);
router.patch("/:scenarioId", requireCsrf, update);
router.delete("/:scenarioId", requireCsrf, remove);
router.post("/:scenarioId/analyze", requireCsrf, analyzeSaved);
router.post("/:scenarioId/duplicate", requireCsrf, duplicate);

module.exports = router;
