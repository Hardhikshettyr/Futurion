const { Router } = require("express");
const { addCategory, categories, create, detail, editCategory, list, update } = require("../controllers/adminLearningController");
const { authenticate } = require("../middleware/authenticate");
const { authorizeRoles } = require("../middleware/authorize");
const { requireCsrf } = require("../middleware/csrfProtection");

const router = Router();
router.use(authenticate, authorizeRoles("admin"));
router.get("/resources", list);
router.get("/resources/:resourceId", detail);
router.get("/categories", categories);
router.use(requireCsrf);
router.post("/resources", create);
router.patch("/resources/:resourceId", update);
router.post("/categories", addCategory);
router.patch("/categories/:categoryId", editCategory);

module.exports = router;
