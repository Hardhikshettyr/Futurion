const { Router } = require("express");
const { categories, detail, filters, list } = require("../controllers/learningResourceController");
const { authenticate } = require("../middleware/authenticate");
const { authorizeRoles } = require("../middleware/authorize");

const router = Router();
router.use(authenticate, authorizeRoles("student", "admin"));
router.use((_request, response, next) => { response.set("Cache-Control", "no-store"); next(); });
router.get("/filters", filters);
router.get("/categories", categories);
router.get("/resources", list);
router.get("/resources/:resourceId", detail);

module.exports = router;
