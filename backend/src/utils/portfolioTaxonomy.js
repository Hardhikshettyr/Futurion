const PORTFOLIO_SECTIONS = [
  "about",
  "education",
  "skills",
  "projects",
  "certifications",
  "experience",
  "career_interests",
  "achievements",
];

const PORTFOLIO_SECTION_LABELS = Object.freeze({
  about: "About Me",
  education: "Education",
  skills: "Skills",
  projects: "Projects",
  certifications: "Certifications",
  experience: "Experience",
  career_interests: "Career Interests",
  achievements: "Selected Achievements",
});

const RESERVED_PORTFOLIO_SLUGS = new Set([
  "admin", "api", "auth", "dashboard", "login", "logout", "portfolio",
  "register", "settings", "student", "verify-email", "www",
]);

function normalizePublicSlug(value) {
  return String(value || "")
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "");
}

function publicSlugFromName(value) {
  return normalizePublicSlug(value).slice(0, 48) || "student-portfolio";
}

module.exports = {
  PORTFOLIO_SECTIONS,
  PORTFOLIO_SECTION_LABELS,
  RESERVED_PORTFOLIO_SLUGS,
  normalizePublicSlug,
  publicSlugFromName,
};
