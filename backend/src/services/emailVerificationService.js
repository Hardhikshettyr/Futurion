const crypto = require("node:crypto");
const { getOtpHashSecret } = require("../config/verification");
const EmailVerification = require("../models/EmailVerification");
const User = require("../models/User");
const { sendVerificationEmail } = require("./emailService");

const OTP_EXPIRY_MS = 5 * 60 * 1000;
const OTP_EXPIRY_SECONDS = OTP_EXPIRY_MS / 1000;
const MAX_VERIFICATION_ATTEMPTS = 5;
const RESEND_COOLDOWN_MS = 60 * 1000;
const RESEND_COOLDOWN_SECONDS = RESEND_COOLDOWN_MS / 1000;

class VerificationError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "VerificationError";
    this.code = code;
    this.details = details;
  }
}

function generateOtp() {
  return crypto.randomInt(100000, 1000000).toString();
}

function hashOtp(userId, otp) {
  return crypto
    .createHmac("sha256", getOtpHashSecret())
    .update(`${userId.toString()}:${otp}`)
    .digest("hex");
}

function otpHashesMatch(actualHash, candidateHash) {
  const actualBuffer = Buffer.from(actualHash, "hex");
  const candidateBuffer = Buffer.from(candidateHash, "hex");

  return (
    actualBuffer.length === candidateBuffer.length &&
    crypto.timingSafeEqual(actualBuffer, candidateBuffer)
  );
}

async function storeChallenge({ userId, otpHash, now, enforceCooldown }) {
  const challengeValues = {
    otpHash,
    expiresAt: new Date(now.getTime() + OTP_EXPIRY_MS),
    attempts: 0,
    lastSentAt: now,
  };

  if (!enforceCooldown) {
    return EmailVerification.findOneAndUpdate(
      { userId },
      { $set: challengeValues, $setOnInsert: { userId } },
      {
        returnDocument: "after",
        upsert: true,
        setDefaultsOnInsert: true,
      },
    );
  }

  const cooldownCutoff = new Date(now.getTime() - RESEND_COOLDOWN_MS);
  const existingChallenge = await EmailVerification.findOneAndUpdate(
    { userId, lastSentAt: { $lte: cooldownCutoff } },
    { $set: challengeValues },
    { returnDocument: "after" },
  );

  if (existingChallenge) {
    return existingChallenge;
  }

  try {
    return await EmailVerification.create({ userId, ...challengeValues });
  } catch (error) {
    if (error?.code === 11000) {
      const currentChallenge = await EmailVerification.findOne({ userId }).select(
        "lastSentAt",
      );
      const retryAfterSeconds = currentChallenge
        ? Math.max(
            1,
            Math.ceil(
              (currentChallenge.lastSentAt.getTime() + RESEND_COOLDOWN_MS -
                now.getTime()) /
                1000,
            ),
          )
        : RESEND_COOLDOWN_SECONDS;

      throw new VerificationError(
        "RESEND_COOLDOWN",
        "Please wait before requesting another verification code",
        { retryAfterSeconds },
      );
    }

    throw error;
  }
}

async function issueVerificationChallenge({
  userId,
  email,
  enforceCooldown = false,
}) {
  const otp = generateOtp();
  const otpHash = hashOtp(userId, otp);
  const now = new Date();

  const challenge = await storeChallenge({
    userId,
    otpHash,
    now,
    enforceCooldown,
  });

  try {
    await sendVerificationEmail(email, otp);
  } catch (error) {
    await EmailVerification.deleteOne({ _id: challenge._id, otpHash });
    throw error;
  }

  return {
    expiresAt: challenge.expiresAt,
    expiresInSeconds: OTP_EXPIRY_SECONDS,
    resendCooldownSeconds: RESEND_COOLDOWN_SECONDS,
  };
}

async function describeUnavailableChallenge(userId, now) {
  const challenge = await EmailVerification.findOne({ userId });

  if (!challenge) {
    throw new VerificationError(
      "CHALLENGE_NOT_FOUND",
      "No active verification challenge was found",
    );
  }

  if (challenge.expiresAt <= now) {
    await EmailVerification.deleteOne({ _id: challenge._id });
    throw new VerificationError(
      "OTP_EXPIRED",
      "The verification code has expired",
    );
  }

  if (challenge.attempts >= MAX_VERIFICATION_ATTEMPTS) {
    throw new VerificationError(
      "ATTEMPTS_EXCEEDED",
      "Too many incorrect verification attempts",
    );
  }

  throw new VerificationError(
    "CHALLENGE_NOT_FOUND",
    "No active verification challenge was found",
  );
}

async function verifyEmailChallenge({ userId, otp }) {
  const now = new Date();
  const challenge = await EmailVerification.findOneAndUpdate(
    {
      userId,
      expiresAt: { $gt: now },
      attempts: { $lt: MAX_VERIFICATION_ATTEMPTS },
    },
    { $inc: { attempts: 1 } },
    { returnDocument: "after" },
  ).select("+otpHash");

  if (!challenge) {
    return describeUnavailableChallenge(userId, now);
  }

  const candidateHash = hashOtp(userId, otp);

  if (!otpHashesMatch(challenge.otpHash, candidateHash)) {
    const remainingAttempts = Math.max(
      0,
      MAX_VERIFICATION_ATTEMPTS - challenge.attempts,
    );

    if (remainingAttempts === 0) {
      throw new VerificationError(
        "ATTEMPTS_EXCEEDED",
        "Too many incorrect verification attempts",
      );
    }

    throw new VerificationError("INVALID_OTP", "Invalid verification code", {
      remainingAttempts,
    });
  }

  const claimedChallenge = await EmailVerification.findOneAndDelete({
    _id: challenge._id,
    otpHash: challenge.otpHash,
    expiresAt: { $gt: new Date() },
    attempts: { $lte: MAX_VERIFICATION_ATTEMPTS },
  }).select("+otpHash");

  if (!claimedChallenge) {
    throw new VerificationError(
      "CHALLENGE_INVALIDATED",
      "The verification code is no longer active",
    );
  }

  await User.updateOne(
    { _id: userId, isEmailVerified: false },
    { $set: { isEmailVerified: true } },
  );
  await EmailVerification.deleteMany({ userId });

  return { verified: true };
}

module.exports = {
  MAX_VERIFICATION_ATTEMPTS,
  OTP_EXPIRY_SECONDS,
  RESEND_COOLDOWN_SECONDS,
  VerificationError,
  generateOtp,
  hashOtp,
  issueVerificationChallenge,
  verifyEmailChallenge,
};
