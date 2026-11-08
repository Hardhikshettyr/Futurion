const mongoose = require("mongoose");
const { PORTFOLIO_SECTIONS, RESERVED_PORTFOLIO_SLUGS, normalizePublicSlug } = require("../utils/portfolioTaxonomy");

const { Schema } = mongoose;

const portfolioSettingsSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
  publicSlug: { type: String, lowercase: true, trim: true, minlength: 3, maxlength: 60 },
  isPublic: { type: Boolean, default: false },
  visibleSections: [{ type: String, enum: PORTFOLIO_SECTIONS }],
  selectedAchievementKeys: [{ type: String, trim: true, maxlength: 120 }],
}, { timestamps: true });

portfolioSettingsSchema.pre("validate", function normalizePortfolioSettings() {
  if (this.publicSlug) {
    this.publicSlug = normalizePublicSlug(this.publicSlug);
    if (!/^[a-z0-9](?:[a-z0-9-]{1,58}[a-z0-9])?$/.test(this.publicSlug)) {
      this.invalidate("publicSlug", "Public slug must contain 3–60 lowercase letters, numbers or single hyphens");
    }
    if (RESERVED_PORTFOLIO_SLUGS.has(this.publicSlug)) this.invalidate("publicSlug", "This public slug is reserved");
  }
  this.visibleSections = [...new Set(this.visibleSections || [])];
  this.selectedAchievementKeys = [...new Set(this.selectedAchievementKeys || [])];
  if (this.selectedAchievementKeys.length > 12) this.invalidate("selectedAchievementKeys", "Select no more than 12 achievements");
  if (this.isPublic && !this.publicSlug) this.invalidate("publicSlug", "Choose a public slug before enabling the portfolio");
});

portfolioSettingsSchema.index(
  { publicSlug: 1 },
  { unique: true, partialFilterExpression: { publicSlug: { $type: "string" } } },
);
portfolioSettingsSchema.index({ isPublic: 1, publicSlug: 1 });

module.exports = mongoose.model("PortfolioSettings", portfolioSettingsSchema);
