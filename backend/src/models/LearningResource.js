const mongoose = require("mongoose");
const {
  PRICE_TYPES,
  RESOURCE_DIFFICULTIES,
  RESOURCE_TYPES,
  cleanLearningLabel,
  normalizeExternalUrl,
  normalizeLearningIdentity,
} = require("../utils/learningTaxonomy");

const { Schema } = mongoose;

function uniqueObjectIds(values) {
  return [...new Map((values || []).map((value) => [String(value), value])).values()];
}

const learningResourceSchema = new Schema({
  title: { type: String, required: true, trim: true, maxlength: 220 },
  normalizedTitle: { type: String, required: true, select: false },
  description: { type: String, required: true, trim: true, maxlength: 2400 },
  resourceType: { type: String, enum: RESOURCE_TYPES, required: true },
  provider: { type: String, required: true, trim: true, maxlength: 180 },
  normalizedProvider: { type: String, required: true, select: false },
  externalUrl: { type: String, required: true, trim: true, maxlength: 700 },
  normalizedUrl: { type: String, required: true, unique: true, select: false },
  skillsCovered: {
    type: [{ type: Schema.Types.ObjectId, ref: "Skill" }],
    default: [],
    set: uniqueObjectIds,
  },
  prerequisites: {
    type: [{ type: Schema.Types.ObjectId, ref: "Skill" }],
    default: [],
    set: uniqueObjectIds,
  },
  difficulty: { type: String, enum: RESOURCE_DIFFICULTIES, required: true },
  duration: { type: String, trim: true, maxlength: 120, default: "" },
  priceType: { type: String, enum: PRICE_TYPES, default: "unknown" },
  priceAmount: { type: Number, min: 0, default: null },
  currency: {
    type: String,
    trim: true,
    uppercase: true,
    maxlength: 3,
    default: "",
    validate: { validator: (value) => !value || value.length === 3, message: "Currency must use a three-letter code" },
  },
  certificateAvailable: { type: Boolean, default: false },
  categoryId: { type: Schema.Types.ObjectId, ref: "LearningResourceCategory", required: true },
  status: { type: String, enum: ["active", "inactive"], default: "active" },
  createdBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
}, { timestamps: true });

learningResourceSchema.pre("validate", function normalizeResource() {
  this.title = cleanLearningLabel(this.title);
  this.provider = cleanLearningLabel(this.provider);
  this.normalizedTitle = normalizeLearningIdentity(this.title);
  this.normalizedProvider = normalizeLearningIdentity(this.provider);
  try {
    this.externalUrl = normalizeExternalUrl(this.externalUrl);
    this.normalizedUrl = this.externalUrl;
  } catch (error) {
    this.invalidate("externalUrl", error.message);
  }
  if (this.priceType === "free") {
    this.priceAmount = 0;
    this.currency = "";
  }
  if (this.priceAmount === null || this.priceAmount === undefined) this.currency = "";
  if (this.priceAmount !== null && this.priceAmount !== undefined && this.priceType !== "free" && !this.currency) {
    this.invalidate("currency", "Currency is required when a price amount is provided");
  }
});

learningResourceSchema.index({ normalizedTitle: 1, normalizedProvider: 1 }, { unique: true });
learningResourceSchema.index({ status: 1, resourceType: 1, difficulty: 1, priceType: 1 });
learningResourceSchema.index({ status: 1, categoryId: 1, provider: 1 });
learningResourceSchema.index({ skillsCovered: 1, status: 1 });
learningResourceSchema.index({ title: "text", description: "text", provider: "text" });

module.exports = mongoose.model("LearningResource", learningResourceSchema);
