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

const PROFICIENCIES = ["beginner", "intermediate", "advanced", "expert"];
const LEARNING_STATUSES = ["not_started", "learning", "practicing", "proficient"];
const EVIDENCE_STATUSES = ["self_declared", "currently_learning", "demonstrated", "verified"];

function skillLabel(value) {
  return String(value || "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export {
  EVIDENCE_STATUSES,
  LEARNING_STATUSES,
  PROFICIENCIES,
  SKILL_CATEGORIES,
  skillLabel,
};
