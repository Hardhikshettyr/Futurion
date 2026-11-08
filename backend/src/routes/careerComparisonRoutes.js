const { Router } = require("express");
const { analyze, create, detail, list, remove, update } = require("../controllers/careerComparisonController");
const { authenticate } = require("../middleware/authenticate");
const { authorizeRoles } = require("../middleware/authorize");
const { requireCsrf } = require("../middleware/csrfProtection");
const { comparisonInsights } = require("../controllers/careerDecisionAiController");
const { careerDecisionAiRateLimiter } = require("../middleware/authRateLimiters");

const router = Router();
router.use(authenticate, authorizeRoles("student"));
router.use((_request, response, next) => { response.set("Cache-Control", "no-store"); next(); });
router.get("/", list);
router.post("/ai-insights", requireCsrf, careerDecisionAiRateLimiter, comparisonInsights);
router.post("/analyze", requireCsrf, analyze);
router.post("/", requireCsrf, create);
router.get("/:comparisonId", detail);
router.patch("/:comparisonId", requireCsrf, update);
router.delete("/:comparisonId", requireCsrf, remove);

module.exports = router;
