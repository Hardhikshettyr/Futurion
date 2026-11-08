const mongoose = require("mongoose");

const { Schema } = mongoose;

const coachMessageSchema = new Schema(
  {
    role: { type: String, enum: ["user", "assistant"], required: true },
    content: { type: String, required: true, maxlength: 4000 },
    knownFacts: { type: [Schema.Types.Mixed], default: [] },
    suggestions: { type: [Schema.Types.Mixed], default: [] },
    unavailableInformation: { type: [String], default: [] },
    followUpQuestions: { type: [String], default: [] },
    model: { type: String, default: "" },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true },
);

const skillCoachConversationSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    messages: { type: [coachMessageSchema], default: [] },
  },
  { timestamps: true },
);

skillCoachConversationSchema.index({ userId: 1, updatedAt: -1 });

module.exports = mongoose.model("SkillCoachConversation", skillCoachConversationSchema);
