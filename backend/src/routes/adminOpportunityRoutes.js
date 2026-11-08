const { Router } = require("express");
const { create, detail, list, remove, update, updateStatus } = require("../controllers/adminOpportunityController");
const { authenticate } = require("../middleware/authenticate");
const { authorizeRoles } = require("../middleware/authorize");
const { requireCsrf } = require("../middleware/csrfProtection");

const router = Router();
router.use(authenticate, authorizeRoles("admin"));
router.get("/", list);
router.get("/:opportunityId", detail);
router.use(requireCsrf);
router.post("/", create);
router.patch("/:opportunityId", update);
router.patch("/:opportunityId/status", updateStatus);
router.delete("/:opportunityId", remove);

module.exports = router;
