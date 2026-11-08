const { Router } = require("express");
const { detail, filters, list } = require("../controllers/opportunityController");
const { authenticate } = require("../middleware/authenticate");
const { authorizeRoles } = require("../middleware/authorize");

const router = Router();
router.use(authenticate, authorizeRoles("student", "admin"));
router.use((_request, response, next) => { response.set("Cache-Control", "no-store"); next(); });
router.get("/filters", filters);
router.get("/", list);
router.get("/:opportunityId", detail);

module.exports = router;
