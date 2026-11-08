const CAREER_CATEGORIES = [
  "software_it",
  "engineering_manufacturing",
  "healthcare_life_sciences",
  "finance_accounting",
  "business_management",
  "marketing_media",
  "law_public_policy",
  "education_research",
  "design_creative",
  "science_mathematics",
  "agriculture_environment",
  "hospitality_tourism",
  "other",
];

const CATEGORY_LABELS = Object.freeze({
  software_it: "Software and Information Technology",
  engineering_manufacturing: "Engineering and Manufacturing",
  healthcare_life_sciences: "Healthcare and Life Sciences",
  finance_accounting: "Finance and Accounting",
  business_management: "Business and Management",
  marketing_media: "Marketing and Media",
  law_public_policy: "Law and Public Policy",
  education_research: "Education and Research",
  design_creative: "Design and Creative Industries",
  science_mathematics: "Science and Mathematics",
  agriculture_environment: "Agriculture and Environmental Sciences",
  hospitality_tourism: "Hospitality and Tourism",
  other: "Other Careers",
});

const WORK_MODES = ["remote", "hybrid", "on_site"];
const EMPLOYMENT_TYPES = [
  "full_time",
  "part_time",
  "contract",
  "freelance",
  "self_employed",
  "internship",
  "public_service",
];
const EDUCATION_PATHWAY_TYPES = ["mandatory", "common", "alternative"];
const CAREER_LEVELS = ["entry", "intermediate", "advanced"];

function normalizeCareerIdentity(value) {
  return String(value || "")
    .normalize("NFKC")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("en");
}

function cleanCareerLabel(value) {
  return String(value || "").normalize("NFKC").trim().replace(/\s+/g, " ");
}

function careerSlug(value) {
  return normalizeCareerIdentity(value)
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

module.exports = {
  CAREER_CATEGORIES,
  CAREER_LEVELS,
  CATEGORY_LABELS,
  EDUCATION_PATHWAY_TYPES,
  EMPLOYMENT_TYPES,
  WORK_MODES,
  careerSlug,
  cleanCareerLabel,
  normalizeCareerIdentity,
};
