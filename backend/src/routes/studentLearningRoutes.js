const { Router } = require("express");
const { add, aiAssistant, aiStatus, library, progress, recommendations, remove, update } = require("../controllers/studentLearningController");
const { authenticate } = require("../middleware/authenticate");
const { authorizeRoles } = require("../middleware/authorize");
const { requireCsrf } = require("../middleware/csrfProtection");
const { learningAiRateLimiter } = require("../middleware/authRateLimiters");

const router = Router();
router.use(authenticate, authorizeRoles("student"));
router.use((_request, response, next) => { response.set("Cache-Control", "no-store"); next(); });
router.get("/recommendations", recommendations);
router.get("/library", library);
router.get("/progress", progress);
router.get("/ai-status", aiStatus);
router.post("/library", requireCsrf, add);
router.patch("/library/:itemId", requireCsrf, update);
router.delete("/library/:itemId", requireCsrf, remove);
router.post("/ai-assistant", requireCsrf, learningAiRateLimiter, aiAssistant);

module.exports = router;
