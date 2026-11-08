const {
  FileValidationError,
  PHOTO_MAX_BYTES,
  RESUME_MAX_BYTES,
  validateProfilePhoto,
  validateResume,
} = require("../src/utils/fileValidation");

function file(buffer, originalname, mimetype, size = buffer.length) {
  return { buffer, originalname, mimetype, size };
}

test("accepts a signature-matched PNG and never reuses its original name", () => {
  const buffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1]);
  const result = validateProfilePhoto(file(buffer, "../../avatar.png", "image/png"));
  expect(result.filename).toBe("profile-photo.png");
  expect(result.filename).not.toContain("avatar");
});

test("rejects a spoofed image MIME type", () => {
  expect(() => validateProfilePhoto(file(Buffer.from("not-an-image"), "photo.png", "image/png"))).toThrow(FileValidationError);
});

test("rejects an oversized image", () => {
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  expect(() => validateProfilePhoto(file(png, "photo.png", "image/png", PHOTO_MAX_BYTES + 1))).toThrow(/3 MB/);
});

test("accepts PDF, DOCX, and DOC signatures", () => {
  const pdf = validateResume(file(Buffer.from("%PDF-1.7"), "resume.pdf", "application/pdf"));
  const docx = validateResume(file(Buffer.from([0x50, 0x4b, 0x03, 0x04]), "resume.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"));
  const doc = validateResume(file(Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]), "resume.doc", "application/msword"));
  expect([pdf.extension, docx.extension, doc.extension]).toEqual(["pdf", "docx", "doc"]);
});

test("rejects unsupported and oversized resumes", () => {
  expect(() => validateResume(file(Buffer.from("hello"), "resume.txt", "text/plain"))).toThrow(/PDF, DOC, or DOCX/);
  expect(() => validateResume(file(Buffer.from("%PDF-"), "resume.pdf", "application/pdf", RESUME_MAX_BYTES + 1))).toThrow(/8 MB/);
});
