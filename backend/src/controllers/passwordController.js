const Session = require("../models/Session");
const User = require("../models/User");
const {
  PasswordResetError,
  issuePasswordResetChallenge,
  resetPasswordWithOtp,
} = require("../services/passwordResetService");
const {
  clearSessionCookies,
  revokeOtherUserSessions,
  rotateCurrentSession,
} = require("../services/sessionService");
const {
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} = require("../validators/authSchemas");
const { validateRequest } = require("../utils/validation");

const GENERIC_RESET_RESPONSE = {
  success: true,
  message:
    "If an eligible account exists, a password reset code will be sent.",
};

async function forgotPassword(request, response, next) {
  const validation = validateRequest(forgotPasswordSchema, request.body);
  if (validation.errors) {
    return response.status(400).json({
      success: false,
      message: "Validation failed",
      errors: validation.errors,
    });
  }

  try {
    const user = await User.findOne({
      email: validation.data.email,
      isActive: true,
      isEmailVerified: true,
    }).select("_id email");

    if (user) {
      try {
        await issuePasswordResetChallenge({
          userId: user._id,
          email: user.email,
        });
      } catch (error) {
        console.error("Password reset email was not delivered", {
          event: "password_reset_delivery_failed",
          userId: user._id.toString(),
          errorType: error.name,
        });
      }
    }

    return response.status(200).json(GENERIC_RESET_RESPONSE);
  } catch (error) {
    return next(error);
  }
}

async function resetPassword(request, response, next) {
  const validation = validateRequest(resetPasswordSchema, request.body);
  if (validation.errors) {
    return response.status(400).json({
      success: false,
      message: "Validation failed",
      errors: validation.errors,
    });
  }

  try {
    const user = await User.findOne({ email: validation.data.email }).select(
      "_id",
    );
    if (!user) {
      return response.status(400).json({
        success: false,
        message: "Reset code is invalid or expired",
      });
    }

    await resetPasswordWithOtp({
      userId: user._id,
      otp: validation.data.otp,
      newPassword: validation.data.newPassword,
    });
    clearSessionCookies(response);
    return response.status(200).json({
      success: true,
      message: "Password reset successfully. Sign in with your new password.",
    });
  } catch (error) {
    if (error instanceof PasswordResetError) {
      const status =
        error.code === "RESET_EXPIRED"
          ? 410
          : error.code === "RESET_ATTEMPTS_EXCEEDED"
            ? 429
            : 400;
      return response.status(status).json({
        success: false,
        message:
          status === 429
            ? "Too many incorrect attempts. Request a new reset code."
            : "Reset code is invalid or expired",
      });
    }
    return next(error);
  }
}

async function changePassword(request, response, next) {
  const validation = validateRequest(changePasswordSchema, request.body);
  if (validation.errors) {
    return response.status(400).json({
      success: false,
      message: "Validation failed",
      errors: validation.errors,
    });
  }

  try {
    const user = await User.findById(request.auth.userId).select("+password");
    const currentMatches = await user.comparePassword(
      validation.data.currentPassword,
    );
    if (!currentMatches) {
      return response.status(400).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    const unchanged = await user.comparePassword(validation.data.newPassword);
    if (unchanged) {
      return response.status(400).json({
        success: false,
        message: "New password must be different from the current password",
      });
    }

    user.password = validation.data.newPassword;
    await user.save();
    await revokeOtherUserSessions(user._id, request.auth.sessionId);

    try {
      const csrfToken = await rotateCurrentSession({
        sessionId: request.auth.sessionId,
        userId: user._id,
        response,
      });
      return response.status(200).json({
        success: true,
        message: "Password changed. Other sessions were signed out.",
        authenticated: true,
        csrfToken,
      });
    } catch {
      await Session.updateOne(
        { _id: request.auth.sessionId },
        { $set: { revokedAt: new Date(), revokedReason: "password_changed" } },
      );
      clearSessionCookies(response);
      return response.status(200).json({
        success: true,
        message: "Password changed. Sign in again to continue.",
        authenticated: false,
      });
    }
  } catch (error) {
    return next(error);
  }
}

module.exports = { changePassword, forgotPassword, resetPassword };
