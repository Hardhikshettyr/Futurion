const { Router } = require("express");
const { getDependencies, getRelated, getSkill, getSkills } = require("../controllers/skillLibraryController");
const { authenticate } = require("../middleware/authenticate");
const { authorizeRoles } = require("../middleware/authorize");

const router = Router();
router.use(authenticate, authorizeRoles("student", "admin"));
router.get("/", getSkills);
router.get("/:skillId/dependencies", getDependencies);
router.get("/:skillId/related", getRelated);
router.get("/:skillId", getSkill);

module.exports = router;
