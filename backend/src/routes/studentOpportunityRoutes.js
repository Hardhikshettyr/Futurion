const { Router } = require("express");
const { aiAssistant, aiStatus, eligibility, recommendations } = require("../controllers/studentOpportunityController");
const { authenticate } = require("../middleware/authenticate");
const { authorizeRoles } = require("../middleware/authorize");
const { requireCsrf } = require("../middleware/csrfProtection");
const { opportunityAiRateLimiter } = require("../middleware/authRateLimiters");

const router = Router();
router.use(authenticate, authorizeRoles("student"));
router.use((_request, response, next) => { response.set("Cache-Control", "no-store"); next(); });
router.get("/recommendations", recommendations);
router.get("/ai-status", aiStatus);
router.get("/:opportunityId/eligibility", eligibility);
router.post("/:opportunityId/ai-assistant", requireCsrf, opportunityAiRateLimiter, aiAssistant);

module.exports = router;
