const { Router } = require("express");
const { analyze, explore, status } = require("../controllers/careerAiController");
const { comparison, recentlyViewed, recommendations, remove, save, saved, view } = require("../controllers/studentCareerController");
const { authenticate } = require("../middleware/authenticate");
const { authorizeRoles } = require("../middleware/authorize");
const { requireCsrf } = require("../middleware/csrfProtection");
const { careerAiRateLimiter } = require("../middleware/authRateLimiters");

const router = Router();
router.use(authenticate, authorizeRoles("student"));
router.use((_request, response, next) => { response.set("Cache-Control", "no-store"); next(); });
router.get("/recommendations", recommendations);
router.get("/saved", saved);
router.get("/recently-viewed", recentlyViewed);
router.get("/ai/status", status);
router.post("/ai/explore", requireCsrf, careerAiRateLimiter, explore);
router.post("/ai/analyze/:careerId", requireCsrf, careerAiRateLimiter, analyze);
router.post("/:careerId/save", requireCsrf, save);
router.delete("/:careerId/save", requireCsrf, remove);
router.patch("/:careerId/comparison", requireCsrf, comparison);
router.post("/:careerId/view", requireCsrf, view);

module.exports = router;
