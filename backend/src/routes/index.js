const { Router } = require("express");
const authRouter = require("./authRoutes");
const adminSkillRouter = require("./adminSkillRoutes");
const skillLibraryRouter = require("./skillLibraryRoutes");
const studentProfileRouter = require("./studentProfileRoutes");
const studentSkillRouter = require("./studentSkillRoutes");
const careerRouter = require("./careerRoutes");
const studentCareerRouter = require("./studentCareerRoutes");
const adminCareerRouter = require("./adminCareerRoutes");
const careerComparisonRouter = require("./careerComparisonRoutes");
const careerScenarioRouter = require("./careerScenarioRoutes");
const learningResourceRouter = require("./learningResourceRoutes");
const studentLearningRouter = require("./studentLearningRoutes");
const adminLearningRouter = require("./adminLearningRoutes");
const roadmapRouter = require("./roadmapRoutes");
const opportunityRouter = require("./opportunityRoutes");
const studentOpportunityRouter = require("./studentOpportunityRoutes");
const studentApplicationRouter = require("./studentApplicationRoutes");
const adminOpportunityRouter = require("./adminOpportunityRoutes");
const studentProgressRouter = require("./studentProgressRoutes");
const studentPortfolioRouter = require("./studentPortfolioRoutes");
const publicPortfolioRouter = require("./publicPortfolioRoutes");

const router = Router();

router.get("/health", (_request, response) => {
  response.status(200).json({
    success: true,
    message: "Futurion backend is running",
  });
});

router.use("/auth", authRouter);
router.use("/skills", skillLibraryRouter);
router.use("/student/skills", studentSkillRouter);
router.use("/student", studentProfileRouter);
router.use("/admin/skills", adminSkillRouter);
router.use("/careers", careerRouter);
router.use("/student/careers", studentCareerRouter);
router.use("/admin/careers", adminCareerRouter);
router.use("/student/career-comparisons", careerComparisonRouter);
router.use("/student/career-scenarios", careerScenarioRouter);
router.use("/learning", learningResourceRouter);
router.use("/student/learning", studentLearningRouter);
router.use("/admin/learning", adminLearningRouter);
router.use("/student/roadmaps", roadmapRouter);
router.use("/opportunities", opportunityRouter);
router.use("/student/opportunities", studentOpportunityRouter);
router.use("/student/applications", studentApplicationRouter);
router.use("/admin/opportunities", adminOpportunityRouter);
router.use("/student/progress", studentProgressRouter);
router.use("/student/portfolio", studentPortfolioRouter);
router.use("/public/portfolio", publicPortfolioRouter);

module.exports = router;
