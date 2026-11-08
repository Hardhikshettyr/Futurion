const mongoose = require("mongoose");
const {
  cleanLearningLabel,
  learningSlug,
  normalizeLearningIdentity,
} = require("../utils/learningTaxonomy");

const { Schema } = mongoose;

const learningResourceCategorySchema = new Schema({
  name: { type: String, required: true, trim: true, maxlength: 120 },
  normalizedName: { type: String, required: true, unique: true, select: false },
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
  description: { type: String, trim: true, maxlength: 500, default: "" },
  status: { type: String, enum: ["active", "inactive"], default: "active" },
  createdBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
}, { timestamps: true });

learningResourceCategorySchema.pre("validate", function normalizeCategory() {
  this.name = cleanLearningLabel(this.name);
  this.normalizedName = normalizeLearningIdentity(this.name);
  this.slug = this.slug ? learningSlug(this.slug) : learningSlug(this.name);
});

learningResourceCategorySchema.index({ status: 1, name: 1 });

module.exports = mongoose.model("LearningResourceCategory", learningResourceCategorySchema);
