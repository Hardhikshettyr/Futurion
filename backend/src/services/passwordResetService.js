const crypto = require("node:crypto");
const { requireSecret } = require("../config/auth");
const PasswordResetChallenge = require("../models/PasswordResetChallenge");
const Session = require("../models/Session");
const User = require("../models/User");
const { sendPasswordResetEmail } = require("./emailService");

const RESET_EXPIRY_MS = 10 * 60 * 1000;
const RESET_MAX_ATTEMPTS = 5;
const RESET_RESEND_COOLDOWN_MS = 60 * 1000;

class PasswordResetError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "PasswordResetError";
    this.code = code;
  }
}

function generateResetOtp() {
  return crypto.randomInt(100000, 1000000).toString();
}

function hashResetOtp(userId, otp) {
  return crypto
    .createHmac("sha256", requireSecret("PASSWORD_RESET_OTP_SECRET"))
    .update(`password-reset:${userId.toString()}:${otp}`)
    .digest("hex");
}

function hashesMatch(first, second) {
  const firstBuffer = Buffer.from(first, "hex");
  const secondBuffer = Buffer.from(second, "hex");
  return (
    firstBuffer.length === secondBuffer.length &&
    crypto.timingSafeEqual(firstBuffer, secondBuffer)
  );
}

async function issuePasswordResetChallenge({ userId, email }) {
  const otp = generateResetOtp();
  const otpHash = hashResetOtp(userId, otp);
  const now = new Date();
  const values = {
    otpHash,
    expiresAt: new Date(now.getTime() + RESET_EXPIRY_MS),
    attempts: 0,
    lastSentAt: now,
  };
  const cooldownCutoff = new Date(now.getTime() - RESET_RESEND_COOLDOWN_MS);

  let challenge = await PasswordResetChallenge.findOneAndUpdate(
    { userId, lastSentAt: { $lte: cooldownCutoff } },
    { $set: values },
    { returnDocument: "after" },
  );

  if (!challenge) {
    try {
      challenge = await PasswordResetChallenge.create({ userId, ...values });
    } catch (error) {
      if (error?.code === 11000) {
        throw new PasswordResetError(
          "RESET_COOLDOWN",
          "A reset code was requested recently",
        );
      }
      throw error;
    }
  }

  try {
    await sendPasswordResetEmail(email, otp);
  } catch (error) {
    await PasswordResetChallenge.deleteOne({ _id: challenge._id, otpHash });
    throw error;
  }
}

async function describeUnavailableChallenge(userId, now) {
  const challenge = await PasswordResetChallenge.findOne({ userId });
  if (!challenge) {
    throw new PasswordResetError(
      "RESET_INVALID",
      "The reset code is invalid or expired",
    );
  }
  if (challenge.expiresAt <= now) {
    await PasswordResetChallenge.deleteOne({ _id: challenge._id });
    throw new PasswordResetError(
      "RESET_EXPIRED",
      "The reset code has expired",
    );
  }
  if (challenge.attempts >= RESET_MAX_ATTEMPTS) {
    throw new PasswordResetError(
      "RESET_ATTEMPTS_EXCEEDED",
      "Too many reset attempts",
    );
  }
  throw new PasswordResetError(
    "RESET_INVALID",
    "The reset code is invalid or expired",
  );
}

async function resetPasswordWithOtp({ userId, otp, newPassword }) {
  const now = new Date();
  const challenge = await PasswordResetChallenge.findOneAndUpdate(
    {
      userId,
      expiresAt: { $gt: now },
      attempts: { $lt: RESET_MAX_ATTEMPTS },
    },
    { $inc: { attempts: 1 } },
    { returnDocument: "after" },
  ).select("+otpHash");

  if (!challenge) return describeUnavailableChallenge(userId, now);

  const candidateHash = hashResetOtp(userId, otp);
  if (!hashesMatch(challenge.otpHash, candidateHash)) {
    const code =
      challenge.attempts >= RESET_MAX_ATTEMPTS
        ? "RESET_ATTEMPTS_EXCEEDED"
        : "RESET_INVALID";
    throw new PasswordResetError(code, "The reset code is invalid or expired");
  }

  const claimed = await PasswordResetChallenge.findOneAndDelete({
    _id: challenge._id,
    otpHash: challenge.otpHash,
    expiresAt: { $gt: new Date() },
    attempts: { $lte: RESET_MAX_ATTEMPTS },
  }).select("+otpHash");
  if (!claimed) {
    throw new PasswordResetError(
      "RESET_INVALIDATED",
      "The reset code is no longer active",
    );
  }

  const user = await User.findById(userId);
  if (!user) {
    throw new PasswordResetError(
      "RESET_INVALID",
      "The reset code is invalid or expired",
    );
  }
  user.password = newPassword;
  await user.save();
  await Session.updateMany(
    { userId, revokedAt: null },
    { $set: { revokedAt: new Date(), revokedReason: "password_reset" } },
  );
  await PasswordResetChallenge.deleteMany({ userId });
}

module.exports = {
  PasswordResetError,
  RESET_MAX_ATTEMPTS,
  generateResetOtp,
  hashResetOtp,
  issuePasswordResetChallenge,
  resetPasswordWithOtp,
};
