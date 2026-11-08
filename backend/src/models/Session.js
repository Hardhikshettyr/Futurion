const mongoose = require("mongoose");

const sessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    refreshTokenHash: {
      type: String,
      required: true,
      select: false,
    },
    previousRefreshTokenHash: {
      type: String,
      default: null,
      select: false,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    revokedAt: {
      type: Date,
      default: null,
      index: true,
    },
    revokedReason: {
      type: String,
      default: null,
      maxlength: 80,
    },
    lastUsedAt: {
      type: Date,
      required: true,
    },
    lastRotatedAt: {
      type: Date,
      default: null,
    },
    userAgent: {
      type: String,
      default: "Unknown device",
      maxlength: 500,
    },
    ipAddress: {
      type: String,
      default: null,
      maxlength: 100,
    },
  },
  { timestamps: true },
);

sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
sessionSchema.index({ userId: 1, revokedAt: 1, expiresAt: 1 });

module.exports = mongoose.model("Session", sessionSchema);
