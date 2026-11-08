const { Router } = require("express");
const { categories, detail, list, related } = require("../controllers/careerController");
const { authenticate } = require("../middleware/authenticate");
const { authorizeRoles } = require("../middleware/authorize");

const router = Router();
router.use(authenticate, authorizeRoles("student", "admin"));
router.use((_request, response, next) => { response.set("Cache-Control", "no-store"); next(); });
router.get("/categories", categories);
router.get("/", list);
router.get("/:careerId/related", related);
router.get("/:careerId", detail);

module.exports = router;
