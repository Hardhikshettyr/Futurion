const { Router } = require("express");
const { achievements, aiAssistant, aiStatus, overview, timeline } = require("../controllers/progressController");
const { authenticate } = require("../middleware/authenticate");
const { authorizeRoles } = require("../middleware/authorize");
const { progressAiRateLimiter } = require("../middleware/authRateLimiters");
const { requireCsrf } = require("../middleware/csrfProtection");

const router = Router();
router.use(authenticate, authorizeRoles("student"));
router.use((_request, response, next) => { response.set("Cache-Control", "no-store"); next(); });
router.get("/overview", overview);
router.get("/timeline", timeline);
router.get("/achievements", achievements);
router.get("/ai-status", aiStatus);
router.post("/ai-assistant", requireCsrf, progressAiRateLimiter, aiAssistant);

module.exports = router;
