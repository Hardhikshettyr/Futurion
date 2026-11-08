const { Router } = require("express");
const { downloadPdf, getOwned, publicSettings, publish, updateContent } = require("../controllers/portfolioController");
const { authenticate } = require("../middleware/authenticate");
const { authorizeRoles } = require("../middleware/authorize");
const { requireCsrf } = require("../middleware/csrfProtection");

const router = Router();
router.use(authenticate, authorizeRoles("student"));
router.use((_request, response, next) => { response.set("Cache-Control", "no-store"); next(); });
router.get("/", getOwned);
router.get("/pdf", downloadPdf);
router.patch("/", requireCsrf, updateContent);
router.post("/public", requireCsrf, publish);
router.patch("/public-settings", requireCsrf, publicSettings);

module.exports = router;
