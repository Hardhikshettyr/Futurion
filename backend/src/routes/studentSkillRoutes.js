const { Router } = require("express");
const {
  createEvidence,
  createStudentSkill,
  deleteEvidence,
  deleteStudentSkill,
  getRecommendations,
  getStudentSkills,
  patchStudentSkill,
  runCompetencyAnalysis,
} = require("../controllers/studentSkillController");
const { authenticate } = require("../middleware/authenticate");
const { authorizeRoles } = require("../middleware/authorize");
const { requireCsrf } = require("../middleware/csrfProtection");
const skillAiRouter = require("./skillAiRoutes");

const router = Router();
router.use(authenticate, authorizeRoles("student"));
router.use((_request, response, next) => {
  response.set("Cache-Control", "no-store");
  next();
});

router.get("/recommendations", getRecommendations);
router.post("/competency-analysis", requireCsrf, runCompetencyAnalysis);
router.use("/ai", skillAiRouter);
router.get("/", getStudentSkills);
router.post("/", requireCsrf, createStudentSkill);
router.patch("/:studentSkillId", requireCsrf, patchStudentSkill);
router.delete("/:studentSkillId", requireCsrf, deleteStudentSkill);
router.post("/:studentSkillId/evidence", requireCsrf, createEvidence);
router.delete("/:studentSkillId/evidence/:evidenceId", requireCsrf, deleteEvidence);

module.exports = router;
