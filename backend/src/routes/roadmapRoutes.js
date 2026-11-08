const { Router } = require("express");
const {
  aiAssistant,
  aiStatus,
  confirmRefresh,
  create,
  detail,
  list,
  refresh,
  remove,
  update,
  updateTask,
} = require("../controllers/roadmapController");
const { authenticate } = require("../middleware/authenticate");
const { authorizeRoles } = require("../middleware/authorize");
const { requireCsrf } = require("../middleware/csrfProtection");
const { roadmapAiRateLimiter } = require("../middleware/authRateLimiters");

const router = Router();
router.use(authenticate, authorizeRoles("student"));
router.use((_request, response, next) => { response.set("Cache-Control", "no-store"); next(); });

router.get("/", list);
router.post("/", requireCsrf, create);
router.get("/:roadmapId", detail);
router.patch("/:roadmapId", requireCsrf, update);
router.delete("/:roadmapId", requireCsrf, remove);
router.patch("/:roadmapId/tasks/:taskId", requireCsrf, updateTask);
router.post("/:roadmapId/refresh", requireCsrf, refresh);
router.post("/:roadmapId/refresh/confirm", requireCsrf, confirmRefresh);
router.get("/:roadmapId/ai-status", aiStatus);
router.post("/:roadmapId/ai-assistant", requireCsrf, roadmapAiRateLimiter, aiAssistant);

module.exports = router;
