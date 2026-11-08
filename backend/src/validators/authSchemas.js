const { z } = require("zod");

const emailSchema = z
  .string({ error: "Email is required" })
  .trim()
  .toLowerCase()
  .pipe(z.email({ error: "Email must be valid" }));

const passwordSchema = z
  .string({ error: "Password is required" })
  .min(8, "Password must be at least 8 characters")
  .refine((password) => Buffer.byteLength(password, "utf8") <= 72, {
    message: "Password must not exceed 72 UTF-8 bytes",
  });

const registrationSchema = z
  .strictObject({
    name: z
      .string({ error: "Name is required" })
      .trim()
      .min(1, "Name is required"),
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string({ error: "Confirm password is required" }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

const verifyEmailSchema = z.strictObject({
  email: emailSchema,
  otp: z
    .string({ error: "Verification code is required" })
    .regex(/^\d{6}$/, "Verification code must contain exactly six digits"),
});

const resendVerificationSchema = z.strictObject({
  email: emailSchema,
});

const loginSchema = z.strictObject({
  email: emailSchema,
  password: z.string({ error: "Password is required" }).min(1),
});

const forgotPasswordSchema = z.strictObject({
  email: emailSchema,
});

const resetPasswordSchema = z
  .strictObject({
    email: emailSchema,
    otp: z
      .string({ error: "Reset code is required" })
      .regex(/^\d{6}$/, "Reset code must contain exactly six digits"),
    newPassword: passwordSchema,
    confirmPassword: z.string({ error: "Confirm password is required" }),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

const changePasswordSchema = z
  .strictObject({
    currentPassword: z.string({ error: "Current password is required" }).min(1),
    newPassword: passwordSchema,
    confirmPassword: z.string({ error: "Confirm password is required" }),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: "New password must be different from the current password",
    path: ["newPassword"],
  });

const sessionIdSchema = z.string().regex(/^[a-f\d]{24}$/i, "Invalid session ID");

module.exports = {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  registrationSchema,
  resendVerificationSchema,
  resetPasswordSchema,
  sessionIdSchema,
  verifyEmailSchema,
};
