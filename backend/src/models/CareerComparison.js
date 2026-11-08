const mongoose = require("mongoose");

const { Schema } = mongoose;

const COMPARISON_DIMENSIONS = [
  "overview",
  "skills",
  "education",
  "certifications",
  "preparation",
  "progression",
];

const careerComparisonSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    careerIds: {
      type: [{ type: Schema.Types.ObjectId, ref: "Career", required: true }],
      required: true,
      validate: {
        validator(values) {
          return values.length >= 2 && values.length <= 4 && new Set(values.map(String)).size === values.length;
        },
        message: "A comparison requires two to four unique careers",
      },
    },
    comparisonSettings: {
      dimensions: {
        type: [{ type: String, enum: COMPARISON_DIMENSIONS }],
        default: COMPARISON_DIMENSIONS,
      },
    },
  },
  { timestamps: true },
);

careerComparisonSchema.index({ userId: 1, updatedAt: -1 });
careerComparisonSchema.index({ userId: 1, careerIds: 1 });

module.exports = mongoose.model("CareerComparison", careerComparisonSchema);
module.exports.COMPARISON_DIMENSIONS = COMPARISON_DIMENSIONS;
