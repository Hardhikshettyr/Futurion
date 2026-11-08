const OPPORTUNITY_TYPES = [
  "internship",
  "full_time_job",
  "graduate_trainee",
  "apprenticeship",
  "scholarship",
  "fellowship",
  "research",
  "competition",
  "other",
];

const OPPORTUNITY_TYPE_LABELS = Object.freeze({
  internship: "Internship",
  full_time_job: "Full-time Job",
  graduate_trainee: "Graduate Trainee",
  apprenticeship: "Apprenticeship",
  scholarship: "Scholarship",
  fellowship: "Fellowship",
  research: "Research",
  competition: "Competition",
  other: "Other",
});

const OPPORTUNITY_WORK_MODES = ["on_site", "hybrid", "remote", "unknown"];
const REQUIREMENT_IMPORTANCE = ["mandatory", "preferred"];
const EDUCATION_LEVELS = ["secondary", "diploma", "undergraduate", "postgraduate", "doctoral"];
const APPLICATION_STATUSES = ["interested", "planning_to_apply", "applied", "assessment", "interview", "selected", "rejected", "withdrawn"];

function cleanOpportunityLabel(value) {
  return String(value || "").normalize("NFKC").trim().replace(/\s+/g, " ");
}

function normalizeOpportunityIdentity(value) {
  return cleanOpportunityLabel(value).toLocaleLowerCase("en");
}

function opportunitySlug(value) {
  return normalizeOpportunityIdentity(value)
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeOpportunityUrl(value) {
  const url = new URL(String(value || "").trim());
  if (url.protocol !== "https:") throw new Error("Opportunity URLs must use HTTPS");
  url.hash = "";
  return url.toString();
}

module.exports = {
  APPLICATION_STATUSES,
  EDUCATION_LEVELS,
  OPPORTUNITY_TYPES,
  OPPORTUNITY_TYPE_LABELS,
  OPPORTUNITY_WORK_MODES,
  REQUIREMENT_IMPORTANCE,
  cleanOpportunityLabel,
  normalizeOpportunityIdentity,
  normalizeOpportunityUrl,
  opportunitySlug,
};
