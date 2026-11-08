const RESOURCE_TYPES = [
  "course",
  "certification",
  "tutorial",
  "book",
  "documentation",
  "university_program",
  "practice_platform",
  "other",
];

const RESOURCE_DIFFICULTIES = ["beginner", "intermediate", "advanced"];
const PRICE_TYPES = ["free", "paid", "unknown"];
const STUDENT_LEARNING_STATUSES = ["not_started", "in_progress", "completed"];

function cleanLearningLabel(value) {
  return String(value || "").normalize("NFKC").trim().replace(/\s+/g, " ");
}

function normalizeLearningIdentity(value) {
  return cleanLearningLabel(value).toLocaleLowerCase("en");
}

function learningSlug(value) {
  return normalizeLearningIdentity(value)
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeExternalUrl(value) {
  const parsed = new URL(String(value || "").trim());
  if (parsed.protocol !== "https:") throw new Error("Learning resource URLs must use HTTPS");
  parsed.hash = "";
  if (parsed.pathname !== "/") parsed.pathname = parsed.pathname.replace(/\/+$/, "");
  return parsed.toString();
}

module.exports = {
  PRICE_TYPES,
  RESOURCE_DIFFICULTIES,
  RESOURCE_TYPES,
  STUDENT_LEARNING_STATUSES,
  cleanLearningLabel,
  learningSlug,
  normalizeExternalUrl,
  normalizeLearningIdentity,
};
