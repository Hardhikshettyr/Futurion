const { Router } = require("express");
const {
  deleteProfilePhoto,
  deleteResume,
  getProfile,
  getProfilePhoto,
  getResume,
  importResume,
  parseResume,
  updateCareerPreferences,
  updateCertifications,
  updateEducation,
  updateExperience,
  updatePersonalInformation,
  updateProjects,
  updateSkills,
  uploadProfilePhoto,
  uploadResume,
} = require("../controllers/studentProfileController");
const { authenticate } = require("../middleware/authenticate");
const { authorizeRoles } = require("../middleware/authorize");
const { requireCsrf } = require("../middleware/csrfProtection");
const {
  profileUploadRateLimiter,
  resumeParsingRateLimiter,
} = require("../middleware/authRateLimiters");
const { uploadPhoto, uploadResume: parseResumeUpload } = require("../middleware/profileUploads");

const router = Router();

router.use(authenticate, authorizeRoles("student"));
router.use((_request, response, next) => {
  response.set("Cache-Control", "no-store");
  next();
});

router.get("/profile", getProfile);
router.patch("/profile/personal", requireCsrf, updatePersonalInformation);
router.put("/profile/education", requireCsrf, updateEducation);
router.put("/profile/skills", requireCsrf, updateSkills);
router.put("/profile/projects", requireCsrf, updateProjects);
router.put("/profile/experience", requireCsrf, updateExperience);
router.put("/profile/certifications", requireCsrf, updateCertifications);
router.patch("/profile/preferences", requireCsrf, updateCareerPreferences);

router.get("/profile/photo", getProfilePhoto);
router.post(
  "/profile/photo",
  requireCsrf,
  profileUploadRateLimiter,
  uploadPhoto,
  uploadProfilePhoto,
);
router.delete("/profile/photo", requireCsrf, deleteProfilePhoto);

router.post("/profile/resume/parse", requireCsrf, resumeParsingRateLimiter, parseResume);
router.post("/profile/resume/import", requireCsrf, importResume);
router.get("/profile/resume", getResume);
router.post(
  "/profile/resume",
  requireCsrf,
  profileUploadRateLimiter,
  parseResumeUpload,
  uploadResume,
);
router.delete("/profile/resume", requireCsrf, deleteResume);

module.exports = router;
