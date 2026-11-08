const SECTION_WEIGHTS = Object.freeze({
  personal: 20,
  education: 15,
  skills: 15,
  projects: 15,
  experience: 10,
  certifications: 5,
  preferences: 10,
  resume: 10,
});

const PLACEHOLDERS = new Set([
  "-",
  "n/a",
  "na",
  "none",
  "not applicable",
  "placeholder",
  "tbd",
  "unknown",
]);

function meaningful(value) {
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized.length > 0 && !PLACEHOLDERS.has(normalized);
  }
  if (Array.isArray(value)) return value.some(meaningful);
  return value !== null && value !== undefined;
}

function uniqueMeaningful(records, keySelector) {
  const seen = new Set();
  return (records || []).filter((record) => {
    const key = keySelector(record)?.trim().toLowerCase();
    if (!meaningful(key) || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function scoreChecks(checks) {
  const completed = checks.filter((check) => check.complete).length;
  return Math.round((completed / checks.length) * 100);
}

function sectionResult(label, checks, suggestion) {
  const missingFields = checks
    .filter((check) => !check.complete)
    .map((check) => check.label);
  const percentage = scoreChecks(checks);
  return {
    label,
    percentage,
    weight: SECTION_WEIGHTS[label.toLowerCase().replace(" ", "")] || 0,
    missingFields,
    suggestions: missingFields.length ? [suggestion] : [],
  };
}

function calculateProfileCompleteness(profile, user) {
  const personal = profile.personal || {};
  const education = uniqueMeaningful(profile.education, (item) => item.institution);
  const skills = uniqueMeaningful(profile.skills, (item) => item.name);
  const projects = uniqueMeaningful(profile.projects, (item) => item.title);
  const experience = uniqueMeaningful(
    profile.experience,
    (item) => `${item.organization || ""}:${item.position || ""}`,
  );
  const certifications = uniqueMeaningful(
    profile.certifications,
    (item) => `${item.name || ""}:${item.issuer || ""}`,
  );
  const preferences = profile.preferences || {};

  const sections = {
    personal: sectionResult(
      "Personal",
      [
        { label: "full name", complete: meaningful(user?.name) },
        { label: "phone number", complete: meaningful(personal.phone) },
        { label: "location", complete: meaningful(personal.city) && meaningful(personal.country) },
        { label: "professional headline", complete: meaningful(personal.headline) },
        { label: "professional summary", complete: meaningful(personal.summary) },
        { label: "professional link", complete: meaningful(personal.linkedInUrl) || meaningful(personal.githubUrl) || meaningful(personal.portfolioUrl) },
        { label: "profile photo", complete: Boolean(personal.photo?.filename) },
      ],
      "Add a concise headline, summary, location, and professional link so others can quickly understand your profile.",
    ),
    education: sectionResult(
      "Education",
      [
        { label: "education record", complete: education.length > 0 },
        { label: "degree or education level", complete: education.some((item) => meaningful(item.degree) || meaningful(item.educationLevel)) },
        { label: "academic discipline", complete: education.some((item) => meaningful(item.academicDiscipline)) },
        { label: "education dates", complete: education.some((item) => meaningful(item.startYear) && meaningful(item.graduationYear)) },
      ],
      "Add your current or most recent education, including discipline and expected graduation year.",
    ),
    skills: sectionResult(
      "Skills",
      [
        { label: "at least three unique skills", complete: skills.length >= 3 },
        { label: "demonstrated skill", complete: skills.some((item) => ["demonstrated", "verified"].includes(item.evidenceStatus)) },
        { label: "skill descriptions or associations", complete: skills.some((item) => meaningful(item.description) || meaningful(item.associatedProject) || meaningful(item.associatedCertification)) },
      ],
      "Add at least three distinct skills and connect them to projects, learning, or certifications.",
    ),
    projects: sectionResult(
      "Projects",
      [
        { label: "project", complete: projects.length > 0 },
        { label: "project description", complete: projects.some((item) => meaningful(item.description)) },
        { label: "contribution or role", complete: projects.some((item) => meaningful(item.role) || meaningful(item.contributions)) },
        { label: "outcome or link", complete: projects.some((item) => meaningful(item.outcomes) || meaningful(item.githubUrl) || meaningful(item.liveUrl)) },
      ],
      "Document a project with your role, contribution, and a measurable outcome or supporting link.",
    ),
    experience: sectionResult(
      "Experience",
      [
        { label: "experience record", complete: experience.length > 0 },
        { label: "experience description", complete: experience.some((item) => meaningful(item.description)) },
        { label: "responsibility or achievement", complete: experience.some((item) => meaningful(item.responsibilities) || meaningful(item.achievements)) },
      ],
      "Add employment, volunteering, research, freelancing, or internship experience and describe your impact.",
    ),
    certifications: sectionResult(
      "Certifications",
      [
        { label: "certification", complete: certifications.length > 0 },
        { label: "credential evidence", complete: certifications.some((item) => meaningful(item.credentialId) || meaningful(item.verificationUrl) || meaningful(item.certificateUrl)) },
      ],
      "Add relevant certifications and include credential evidence when available.",
    ),
    preferences: sectionResult(
      "Preferences",
      [
        { label: "preferred role", complete: meaningful(preferences.preferredRoles) },
        { label: "career interests", complete: meaningful(preferences.careerInterests) },
        { label: "work mode", complete: meaningful(preferences.workModes) },
        { label: "short-term objective", complete: meaningful(preferences.shortTermObjective) },
        { label: "long-term objective", complete: meaningful(preferences.longTermObjective) },
      ],
      "Describe roles, interests, work modes, and near- and long-term objectives without limiting them to your degree.",
    ),
    resume: sectionResult(
      "Resume",
      [{ label: "resume", complete: Boolean(profile.resume?.filename) }],
      "Upload a current resume so your profile and future career tools have a reliable reference.",
    ),
  };

  for (const [key, result] of Object.entries(sections)) {
    result.weight = SECTION_WEIGHTS[key];
  }

  const overall = Math.round(
    Object.entries(sections).reduce(
      (total, [key, result]) =>
        total + (result.percentage * SECTION_WEIGHTS[key]) / 100,
      0,
    ),
  );

  return {
    overall,
    sections,
    missingFields: Object.entries(sections).flatMap(([section, result]) =>
      result.missingFields.map((field) => `${section}.${field}`),
    ),
    suggestions: Object.values(sections)
      .filter((section) => section.percentage < 100)
      .flatMap((section) => section.suggestions),
    metric: "profile_completeness",
  };
}

module.exports = {
  SECTION_WEIGHTS,
  calculateProfileCompleteness,
  meaningful,
  uniqueMeaningful,
};
