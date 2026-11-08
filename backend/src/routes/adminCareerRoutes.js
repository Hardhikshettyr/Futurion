const { Router } = require("express");
const { addRelationship, create, detail, list, removeRelationship, update, updateStatus } = require("../controllers/adminCareerController");
const { authenticate } = require("../middleware/authenticate");
const { authorizeRoles } = require("../middleware/authorize");
const { requireCsrf } = require("../middleware/csrfProtection");

const router = Router();
router.use(authenticate, authorizeRoles("admin"));
router.get("/", list);
router.get("/:careerId", detail);
router.use(requireCsrf);
router.post("/", create);
router.patch("/:careerId", update);
router.patch("/:careerId/status", updateStatus);
router.post("/:careerId/relationships", addRelationship);
router.delete("/:careerId/relationships", removeRelationship);

module.exports = router;
