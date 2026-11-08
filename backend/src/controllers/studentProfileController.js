const {
  FileValidationError,
  validateProfilePhoto,
  validateResume,
} = require("../utils/fileValidation");
const {
  ResumeParsingError,
  parseResumeWithGemini,
} = require("../services/resumeParsingService");
const {
  getOrCreateStudentProfile,
  importResumeSelection,
  presentStudentProfile,
  removeProfileFile,
  replaceProfileFile,
  replaceSection,
  updatePersonal,
  updatePreferences,
} = require("../services/studentProfileService");
const { readPrivateFile } = require("../services/storageService");
const { profileSkillProjection } = require("../services/studentSkillService");
const {
  migrateProfileSkills,
  skillIdentityMap,
} = require("../services/legacySkillMigrationService");
const { normalizeSkillIdentity } = require("../utils/skillTaxonomy");
const {
  resumeImportSchema,
  schemas,
} = require("../validators/studentProfileSchemas");
const { validateRequest } = require("../utils/validation");

function validationFailure(response, errors) {
  return response.status(400).json({
    success: false,
    message: "Validation failed",
    errors,
  });
}

async function getProfile(request, response, next) {
  try {
    const profile = await getOrCreateStudentProfile(request.auth.userId);
    const canonicalSkills = await profileSkillProjection(request.auth.userId);
    const presented = presentStudentProfile(profile, request.auth.user);
    if (canonicalSkills.length) {
      const canonicalNames = new Set(canonicalSkills.map((skill) => normalizeSkillIdentity(skill.name)));
      presented.skills = [
        ...canonicalSkills,
        ...presented.skills.filter((skill) => !canonicalNames.has(normalizeSkillIdentity(skill.name))),
      ];
    }
    return response.status(200).json({
      success: true,
      profile: presented,
    });
  } catch (error) {
    return next(error);
  }
}

async function updatePersonalInformation(request, response, next) {
  const validation = validateRequest(schemas.personal, request.body);
  if (validation.errors) return validationFailure(response, validation.errors);
  try {
    const profile = await getOrCreateStudentProfile(request.auth.userId);
    const result = await updatePersonal({
      profile,
      user: request.auth.user,
      values: validation.data,
    });
    return response.status(200).json({
      success: true,
      message: "Personal information saved",
      profile: result,
    });
  } catch (error) {
    return next(error);
  }
}

function updateArraySection(section) {
  return async function updateSection(request, response, next) {
    const validation = validateRequest(schemas[section], request.body);
    if (validation.errors) return validationFailure(response, validation.errors);
    try {
      const profile = await getOrCreateStudentProfile(request.auth.userId);
      const result = await replaceSection({
        profile,
        section,
        values: validation.data[section],
        user: request.auth.user,
      });
      if (section === "skills") {
        await migrateProfileSkills(profile, await skillIdentityMap());
      }
      return response.status(200).json({
        success: true,
        message: `${section[0].toUpperCase()}${section.slice(1)} saved`,
        profile: result,
      });
    } catch (error) {
      return next(error);
    }
  };
}

async function updateCareerPreferences(request, response, next) {
  const validation = validateRequest(schemas.preferences, request.body);
  if (validation.errors) return validationFailure(response, validation.errors);
  try {
    const profile = await getOrCreateStudentProfile(request.auth.userId);
    const result = await updatePreferences({
      profile,
      user: request.auth.user,
      values: validation.data,
    });
    return response.status(200).json({
      success: true,
      message: "Career preferences saved",
      profile: result,
    });
  } catch (error) {
    return next(error);
  }
}

function fileErrorResponse(error, response) {
  if (!(error instanceof FileValidationError)) return false;
  response.status(error.status).json({
    success: false,
    code: error.code,
    message: error.message,
  });
  return true;
}

async function uploadProfilePhoto(request, response, next) {
  try {
    const fileInfo = validateProfilePhoto(request.file);
    const profile = await getOrCreateStudentProfile(request.auth.userId);
    const result = await replaceProfileFile({
      buffer: request.file.buffer,
      fileInfo,
      kind: "photo",
      profile,
      user: request.auth.user,
    });
    return response.status(200).json({
      success: true,
      message: "Profile photo updated",
      profile: result,
    });
  } catch (error) {
    if (fileErrorResponse(error, response)) return response;
    return next(error);
  }
}

async function uploadResume(request, response, next) {
  try {
    const fileInfo = validateResume(request.file);
    const profile = await getOrCreateStudentProfile(request.auth.userId);
    const result = await replaceProfileFile({
      buffer: request.file.buffer,
      fileInfo,
      kind: "resume",
      profile,
      user: request.auth.user,
    });
    return response.status(200).json({
      success: true,
      message: "Resume uploaded securely",
      profile: result,
    });
  } catch (error) {
    if (fileErrorResponse(error, response)) return response;
    return next(error);
  }
}

async function sendOwnedFile({ request, response, next, kind }) {
  try {
    const profile = await getOrCreateStudentProfile(request.auth.userId);
    const file = kind === "photo" ? profile.personal.photo : profile.resume;
    if (!file?.storageKey) {
      return response.status(404).json({
        success: false,
        message: kind === "photo" ? "Profile photo was not found" : "Resume was not found",
      });
    }
    const buffer = await readPrivateFile(file.storageKey);
    response.set({
      "Cache-Control": "private, no-store",
      "Content-Length": buffer.length,
      "Content-Type": file.mimeType,
      "Content-Disposition": `${kind === "photo" ? "inline" : "attachment"}; filename="${file.filename}"`,
      "X-Content-Type-Options": "nosniff",
    });
    return response.status(200).send(buffer);
  } catch (error) {
    if (error.code === "ENOENT") {
      return response.status(404).json({ success: false, message: "Stored file was not found" });
    }
    return next(error);
  }
}

function getProfilePhoto(request, response, next) {
  return sendOwnedFile({ request, response, next, kind: "photo" });
}

function getResume(request, response, next) {
  return sendOwnedFile({ request, response, next, kind: "resume" });
}

function deleteOwnedFile(kind) {
  return async function removeFile(request, response, next) {
    try {
      const profile = await getOrCreateStudentProfile(request.auth.userId);
      const result = await removeProfileFile({
        kind,
        profile,
        user: request.auth.user,
      });
      return response.status(200).json({
        success: true,
        message: kind === "photo" ? "Profile photo removed" : "Resume removed",
        profile: result,
      });
    } catch (error) {
      return next(error);
    }
  };
}

async function parseResume(request, response, next) {
  try {
    const profile = await getOrCreateStudentProfile(request.auth.userId);
    if (!profile.resume?.storageKey) {
      return response.status(404).json({
        success: false,
        code: "RESUME_REQUIRED",
        message: "Upload a resume before asking AI to parse it",
      });
    }
    if (
      profile.resume.lastParsedAt &&
      Date.now() - profile.resume.lastParsedAt.getTime() < 30_000
    ) {
      return response.status(429).json({
        success: false,
        code: "AI_PARSE_COOLDOWN",
        message: "This resume was parsed recently. Review the result before trying again.",
      });
    }
    const buffer = await readPrivateFile(profile.resume.storageKey);
    const extraction = await parseResumeWithGemini({
      buffer,
      mimeType: profile.resume.mimeType,
    });
    profile.resume.lastParsedAt = new Date();
    await profile.save();
    return response.status(200).json({
      success: true,
      message: "Resume information is ready for your review",
      extraction,
      notice: "AI output is unverified. Review, edit, and select information before saving.",
    });
  } catch (error) {
    if (error instanceof ResumeParsingError) {
      return response.status(error.status).json({
        success: false,
        code: error.code,
        message: error.message,
      });
    }
    return next(error);
  }
}

async function importResume(request, response, next) {
  const validation = validateRequest(resumeImportSchema, request.body);
  if (validation.errors) return validationFailure(response, validation.errors);
  try {
    const profile = await getOrCreateStudentProfile(request.auth.userId);
    const result = await importResumeSelection({
      profile,
      user: request.auth.user,
      ...validation.data,
    });
    await migrateProfileSkills(profile, await skillIdentityMap());
    return response.status(200).json({
      success: true,
      message: "Selected resume information imported",
      ...result,
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  deleteProfilePhoto: deleteOwnedFile("photo"),
  deleteResume: deleteOwnedFile("resume"),
  getProfile,
  getProfilePhoto,
  getResume,
  importResume,
  parseResume,
  updateCareerPreferences,
  updateCertifications: updateArraySection("certifications"),
  updateEducation: updateArraySection("education"),
  updateExperience: updateArraySection("experience"),
  updatePersonalInformation,
  updateProjects: updateArraySection("projects"),
  updateSkills: updateArraySection("skills"),
  uploadProfilePhoto,
  uploadResume,
};
