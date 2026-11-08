const multer = require("multer");
const {
  PHOTO_MAX_BYTES,
  RESUME_MAX_BYTES,
} = require("../utils/fileValidation");

function memoryUpload({ fieldName, maxBytes }) {
  const parser = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: maxBytes, files: 1, fields: 0 },
  }).single(fieldName);

  return function parseUpload(request, response, next) {
    parser(request, response, (error) => {
      if (!error) return next();
      if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
        return response.status(413).json({
          success: false,
          code: "FILE_TOO_LARGE",
          message: `The uploaded file exceeds the ${Math.round(maxBytes / 1024 / 1024)} MB limit`,
        });
      }
      return response.status(400).json({
        success: false,
        code: "UPLOAD_INVALID",
        message: "The file upload could not be processed",
      });
    });
  };
}

const uploadPhoto = memoryUpload({ fieldName: "photo", maxBytes: PHOTO_MAX_BYTES });
const uploadResume = memoryUpload({ fieldName: "resume", maxBytes: RESUME_MAX_BYTES });

module.exports = { uploadPhoto, uploadResume };
