const { Router } = require("express");
const { create, list, remove, update } = require("../controllers/studentApplicationController");
const { authenticate } = require("../middleware/authenticate");
const { authorizeRoles } = require("../middleware/authorize");
const { requireCsrf } = require("../middleware/csrfProtection");

const router = Router();
router.use(authenticate, authorizeRoles("student"));
router.use((_request, response, next) => { response.set("Cache-Control", "no-store"); next(); });
router.get("/", list);
router.post("/", requireCsrf, create);
router.patch("/:applicationId", requireCsrf, update);
router.delete("/:applicationId", requireCsrf, remove);

module.exports = router;
