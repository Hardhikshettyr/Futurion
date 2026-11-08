const mongoose = require("mongoose");

const passwordResetChallengeSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    otpHash: {
      type: String,
      required: true,
      select: false,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    attempts: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    lastSentAt: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true },
);

passwordResetChallengeSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0 },
);

module.exports = mongoose.model(
  "PasswordResetChallenge",
  passwordResetChallengeSchema,
);
