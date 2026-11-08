const SKILL_CATEGORIES = [
  "technical",
  "domain_specific",
  "analytical",
  "communication",
  "creative",
  "business",
  "research",
  "leadership",
  "transferable",
  "digital",
  "other",
];

const PROFICIENCY_LEVELS = ["beginner", "intermediate", "advanced", "expert"];
const EVIDENCE_STATUSES = [
  "self_declared",
  "currently_learning",
  "demonstrated",
  "verified",
];
const LEARNING_STATUSES = ["not_started", "learning", "practicing", "proficient"];
const EVIDENCE_TYPES = [
  "project",
  "certification",
  "internship",
  "employment",
  "research",
  "coursework",
  "assessment",
  "other",
];
const DIFFICULTY_LEVELS = ["foundational", "intermediate", "advanced"];

const PROFICIENCY_VALUES = Object.freeze({
  beginner: 1,
  intermediate: 2,
  advanced: 3,
  expert: 4,
});

function normalizeSkillIdentity(value) {
  return String(value || "")
    .normalize("NFKC")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("en");
}

function cleanSkillLabel(value) {
  return String(value || "").normalize("NFKC").trim().replace(/\s+/g, " ");
}

function skillSlug(value) {
  return normalizeSkillIdentity(value)
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function legacyCategory(category) {
  if (["technical", "digital"].includes(category)) return "technical";
  if (["communication", "analytical", "leadership", "transferable"].includes(category)) {
    return "transferable";
  }
  return "domain_specific";
}

module.exports = {
  DIFFICULTY_LEVELS,
  EVIDENCE_STATUSES,
  EVIDENCE_TYPES,
  LEARNING_STATUSES,
  PROFICIENCY_LEVELS,
  PROFICIENCY_VALUES,
  SKILL_CATEGORIES,
  cleanSkillLabel,
  legacyCategory,
  normalizeSkillIdentity,
  skillSlug,
};
