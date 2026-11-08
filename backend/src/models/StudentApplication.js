const mongoose = require("mongoose");
const { APPLICATION_STATUSES } = require("../utils/opportunityTaxonomy");

const { Schema } = mongoose;

const studentApplicationSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  opportunityId: { type: Schema.Types.ObjectId, ref: "Opportunity", required: true },
  saved: { type: Boolean, default: true },
  inTracker: { type: Boolean, default: false },
  status: { type: String, enum: APPLICATION_STATUSES, default: "interested" },
  applicationDate: { type: Date, default: null },
  notes: { type: String, trim: true, maxlength: 3000, default: "" },
  statusUpdatedAt: { type: Date, default: Date.now },
}, { timestamps: true });

studentApplicationSchema.index({ userId: 1, opportunityId: 1 }, { unique: true });
studentApplicationSchema.index({ userId: 1, inTracker: 1, status: 1, updatedAt: -1 });

module.exports = mongoose.model("StudentApplication", studentApplicationSchema);
