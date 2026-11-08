const mongoose = require("mongoose");
const {
  DIFFICULTY_LEVELS,
  SKILL_CATEGORIES,
  cleanSkillLabel,
  normalizeSkillIdentity,
} = require("../utils/skillTaxonomy");

const { Schema } = mongoose;

const prerequisiteRuleSchema = new Schema(
  {
    skillId: { type: Schema.Types.ObjectId, ref: "Skill", required: true },
    importance: {
      type: String,
      enum: ["essential", "recommended"],
      default: "essential",
    },
    minimumProficiency: {
      type: String,
      enum: ["beginner", "intermediate", "advanced", "expert"],
      default: "beginner",
    },
    requiredForLevels: {
      type: [{ type: String, enum: ["beginner", "intermediate", "advanced", "expert"] }],
      default: [],
    },
  },
  { _id: false },
);

function uniqueObjectIds(values) {
  return [...new Map((values || []).map((value) => [String(value), value])).values()];
}

const skillSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    normalizedName: { type: String, required: true, unique: true, select: false },
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
    description: { type: String, trim: true, maxlength: 1600, default: "" },
    category: { type: String, enum: SKILL_CATEGORIES, required: true },
    subcategory: { type: String, trim: true, maxlength: 120, default: "" },
    aliases: [{ type: String, trim: true, maxlength: 120 }],
    normalizedAliases: [{ type: String, select: false }],
    parentSkillId: { type: Schema.Types.ObjectId, ref: "Skill", default: null },
    relatedSkills: {
      type: [{ type: Schema.Types.ObjectId, ref: "Skill" }],
      default: [],
      set: uniqueObjectIds,
    },
    prerequisites: {
      type: [{ type: Schema.Types.ObjectId, ref: "Skill" }],
      default: [],
      set: uniqueObjectIds,
    },
    prerequisiteRules: {
      type: [prerequisiteRuleSchema],
      default: [],
    },
    difficultyLevel: {
      type: String,
      enum: DIFFICULTY_LEVELS,
      default: "foundational",
    },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true },
);

skillSchema.pre("validate", function normalizeSkill() {
  this.name = cleanSkillLabel(this.name);
  this.normalizedName = normalizeSkillIdentity(this.name);
  const aliases = [...new Set((this.aliases || []).map(cleanSkillLabel).filter(Boolean))]
    .filter((alias) => normalizeSkillIdentity(alias) !== this.normalizedName);
  this.aliases = aliases;
  this.normalizedAliases = aliases.map(normalizeSkillIdentity);

  const prerequisiteIds = new Set((this.prerequisites || []).map(String));
  const ruleBySkill = new Map();
  (this.prerequisiteRules || []).forEach((rule) => {
    const id = String(rule.skillId);
    if (!prerequisiteIds.has(id) || ruleBySkill.has(id)) return;
    ruleBySkill.set(id, {
      skillId: rule.skillId,
      importance: rule.importance || "essential",
      minimumProficiency: rule.minimumProficiency || "beginner",
      requiredForLevels: [...new Set(rule.requiredForLevels || [])],
    });
  });
  (this.prerequisites || []).forEach((skillId) => {
    const id = String(skillId);
    if (!ruleBySkill.has(id)) {
      ruleBySkill.set(id, {
        skillId,
        importance: "essential",
        minimumProficiency: "beginner",
        requiredForLevels: [],
      });
    }
  });
  this.prerequisiteRules = [...ruleBySkill.values()];
});

skillSchema.index({ status: 1, category: 1, name: 1 });
skillSchema.index({ status: 1, subcategory: 1, name: 1 });
skillSchema.index({ name: "text", aliases: "text", description: "text" });
skillSchema.index({ normalizedAliases: 1 });

module.exports = mongoose.model("Skill", skillSchema);
