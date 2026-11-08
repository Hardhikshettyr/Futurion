const crypto = require("node:crypto");
const path = require("node:path");

const PHOTO_MAX_BYTES = 3 * 1024 * 1024;
const RESUME_MAX_BYTES = 8 * 1024 * 1024;

class FileValidationError extends Error {
  constructor(code, message, status = 400) {
    super(message);
    this.name = "FileValidationError";
    this.code = code;
    this.status = status;
  }
}

function beginsWith(buffer, bytes) {
  return bytes.every((byte, index) => buffer[index] === byte);
}

function validateProfilePhoto(file) {
  if (!file?.buffer?.length) {
    throw new FileValidationError("PHOTO_REQUIRED", "Choose a profile photo to upload");
  }
  if (file.size > PHOTO_MAX_BYTES) {
    throw new FileValidationError("PHOTO_TOO_LARGE", "Profile photos must be 3 MB or smaller", 413);
  }

  const signatures = {
    "image/jpeg": { extension: "jpg", valid: beginsWith(file.buffer, [0xff, 0xd8, 0xff]) },
    "image/png": { extension: "png", valid: beginsWith(file.buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]) },
    "image/webp": { extension: "webp", valid: file.buffer.subarray(0, 4).toString() === "RIFF" && file.buffer.subarray(8, 12).toString() === "WEBP" },
  };
  const extension = path.extname(file.originalname || "").toLowerCase();
  const allowedExtensions = {
    "image/jpeg": [".jpg", ".jpeg"],
    "image/png": [".png"],
    "image/webp": [".webp"],
  };
  if (!allowedExtensions[file.mimetype]?.includes(extension)) {
    throw new FileValidationError("PHOTO_TYPE_INVALID", "Use a valid JPG, PNG, or WebP image");
  }
  const match = signatures[file.mimetype];
  if (!match?.valid) {
    throw new FileValidationError("PHOTO_TYPE_INVALID", "Use a valid JPEG, PNG, or WebP image");
  }
  return {
    extension: match.extension,
    filename: `profile-photo.${match.extension}`,
    mimeType: file.mimetype,
    contentHash: crypto.createHash("sha256").update(file.buffer).digest("hex"),
  };
}

function validateResume(file) {
  if (!file?.buffer?.length) {
    throw new FileValidationError("RESUME_REQUIRED", "Choose a resume to upload");
  }
  if (file.size > RESUME_MAX_BYTES) {
    throw new FileValidationError("RESUME_TOO_LARGE", "Resumes must be 8 MB or smaller", 413);
  }

  const extension = path.extname(file.originalname || "").toLowerCase();
  const pdf = file.mimetype === "application/pdf" && extension === ".pdf" && file.buffer.subarray(0, 5).toString() === "%PDF-";
  const docx = file.mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" && extension === ".docx" && beginsWith(file.buffer, [0x50, 0x4b, 0x03, 0x04]);
  const doc = file.mimetype === "application/msword" && extension === ".doc" && beginsWith(file.buffer, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
  const type = pdf
    ? { extension: "pdf", filename: "futurion-resume.pdf" }
    : docx
      ? { extension: "docx", filename: "futurion-resume.docx" }
      : doc
        ? { extension: "doc", filename: "futurion-resume.doc" }
        : null;

  if (!type) {
    throw new FileValidationError("RESUME_TYPE_INVALID", "Use a valid PDF, DOC, or DOCX resume");
  }
  return {
    ...type,
    mimeType: file.mimetype,
    contentHash: crypto.createHash("sha256").update(file.buffer).digest("hex"),
  };
}

module.exports = {
  FileValidationError,
  PHOTO_MAX_BYTES,
  RESUME_MAX_BYTES,
  validateProfilePhoto,
  validateResume,
};
