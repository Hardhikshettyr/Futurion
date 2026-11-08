const { Router } = require("express");
const {
  addRelationship,
  create,
  removeRelationship,
  update,
  updateStatus,
} = require("../controllers/adminSkillController");
const { authenticate } = require("../middleware/authenticate");
const { authorizeRoles } = require("../middleware/authorize");
const { requireCsrf } = require("../middleware/csrfProtection");

const router = Router();
router.use(authenticate, authorizeRoles("admin"), requireCsrf);
router.post("/", create);
router.patch("/:skillId", update);
router.patch("/:skillId/status", updateStatus);
router.post("/:skillId/relationships", addRelationship);
router.delete("/:skillId/relationships", removeRelationship);

module.exports = router;
