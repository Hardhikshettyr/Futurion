const User = require("../models/User");
const {
  issueVerificationChallenge,
  OTP_EXPIRY_SECONDS,
  RESEND_COOLDOWN_SECONDS,
  VerificationError,
  verifyEmailChallenge,
} = require("../services/emailVerificationService");
const {
  registrationSchema,
  resendVerificationSchema,
  verifyEmailSchema,
} = require("../validators/authSchemas");
const { validateRequest } = require("../utils/validation");
const { toSafeUser } = require("../utils/userPresenter");

async function registerStudent(request, response, next) {
  const validationResult = validateRequest(registrationSchema, request.body);

  if (validationResult.errors) {
    return response.status(400).json({
      success: false,
      message: "Validation failed",
      errors: validationResult.errors,
    });
  }

  const { name, email, password } = validationResult.data;

  try {
    const existingUser = await User.exists({ email });

    if (existingUser) {
      return response.status(409).json({
        success: false,
        message: "An account with this email already exists",
      });
    }

    const user = await User.create({ name, email, password });
    let emailSent = true;

    try {
      await issueVerificationChallenge({
        userId: user._id,
        email: user.email,
      });
    } catch (error) {
      emailSent = false;
      console.error("Verification delivery could not be initiated", {
        event: "verification_delivery_failed",
        userId: user._id.toString(),
        errorType: error.name,
      });
    }

    return response.status(201).json({
      success: true,
      message: emailSent
        ? "Student registered. Check your email for the verification code."
        : "Student registered, but the verification email could not be sent. Request a new code to continue.",
      user: toSafeUser(user),
      verification: {
        emailSent,
        expiresInSeconds: OTP_EXPIRY_SECONDS,
        resendCooldownSeconds: emailSent ? RESEND_COOLDOWN_SECONDS : 0,
      },
    });
  } catch (error) {
    if (error && error.code === 11000) {
      return response.status(409).json({
        success: false,
        message: "An account with this email already exists",
      });
    }

    return next(error);
  }
}

async function verifyEmail(request, response, next) {
  const validationResult = validateRequest(verifyEmailSchema, request.body);

  if (validationResult.errors) {
    return response.status(400).json({
      success: false,
      message: "Validation failed",
      errors: validationResult.errors,
    });
  }

  const { email, otp } = validationResult.data;

  try {
    const user = await User.findOne({ email }).select(
      "_id email isEmailVerified",
    );

    if (!user) {
      return response.status(400).json({
        success: false,
        message: "Invalid or expired verification code",
      });
    }

    if (user.isEmailVerified) {
      return response.status(200).json({
        success: true,
        message: "Email address is already verified",
        verification: { isEmailVerified: true },
      });
    }

    await verifyEmailChallenge({ userId: user._id, otp });

    return response.status(200).json({
      success: true,
      message: "Email verified successfully",
      verification: { isEmailVerified: true },
    });
  } catch (error) {
    if (!(error instanceof VerificationError)) {
      return next(error);
    }

    if (error.code === "OTP_EXPIRED") {
      return response.status(410).json({
        success: false,
        message: "Verification code has expired. Request a new code.",
      });
    }

    if (error.code === "ATTEMPTS_EXCEEDED") {
      return response.status(429).json({
        success: false,
        message: "Too many incorrect attempts. Request a new code.",
      });
    }

    return response.status(400).json({
      success: false,
      message: "Invalid or expired verification code",
      ...(error.details.remainingAttempts !== undefined && {
        verification: {
          remainingAttempts: error.details.remainingAttempts,
        },
      }),
    });
  }
}

async function resendVerification(request, response, next) {
  const validationResult = validateRequest(
    resendVerificationSchema,
    request.body,
  );

  if (validationResult.errors) {
    return response.status(400).json({
      success: false,
      message: "Validation failed",
      errors: validationResult.errors,
    });
  }

  const { email } = validationResult.data;
  const genericResponse = {
    success: true,
    message:
      "If an unverified account exists, a new verification code will be sent when eligible.",
    verification: { resendCooldownSeconds: RESEND_COOLDOWN_SECONDS },
  };

  try {
    const user = await User.findOne({ email }).select(
      "_id email isEmailVerified",
    );

    if (!user || user.isEmailVerified) {
      return response.status(200).json(genericResponse);
    }

    try {
      await issueVerificationChallenge({
        userId: user._id,
        email: user.email,
        enforceCooldown: true,
      });
    } catch (error) {
      console.error("Verification resend was not delivered", {
        event: "verification_resend_failed",
        userId: user._id.toString(),
        errorType: error.name,
      });
    }

    return response.status(200).json(genericResponse);
  } catch (error) {
    return next(error);
  }
}

module.exports = { registerStudent, resendVerification, verifyEmail };
