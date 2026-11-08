const { Router } = require("express");
const { publicPortfolio } = require("../controllers/portfolioController");

const router = Router();
router.use((_request, response, next) => { response.set("Cache-Control", "no-store"); next(); });
router.get("/:publicSlug", publicPortfolio);

module.exports = router;
