const PortfolioSettings = require("../models/PortfolioSettings");
const User = require("../models/User");
const AppError = require("../utils/AppError");
const { PORTFOLIO_SECTIONS, publicSlugFromName } = require("../utils/portfolioTaxonomy");
const { getProgressBundle } = require("./progressService");

function idOf(value) { return String(value?._id || value); }
function plain(value) { return value?.toObject ? value.toObject() : value; }
function defaultSettings() { return { publicSlug: null, isPublic: false, visibleSections: [], selectedAchievementKeys: [], createdAt: null, updatedAt: null }; }
function presentSettings(settings) {
  const value = settings ? plain(settings) : defaultSettings();
  return {
    publicSlug: value.publicSlug || null,
    isPublic: Boolean(value.isPublic),
    visibleSections: value.visibleSections || [],
    selectedAchievementKeys: value.selectedAchievementKeys || [],
    publicPath: value.publicSlug ? `/portfolio/${value.publicSlug}` : null,
    createdAt: value.createdAt || null,
    updatedAt: value.updatedAt || null,
  };
}

function safeEducation(item) {
  return { id: idOf(item), institution: item.institution, degree: item.degree || "", academicDiscipline: item.academicDiscipline || "", specialization: item.specialization || "", educationLevel: item.educationLevel || "", startYear: item.startYear || null, graduationYear: item.graduationYear || null, currentStatus: item.currentStatus || "", location: item.location || "", relevantCoursework: item.relevantCoursework || [], academicAchievements: item.academicAchievements || [] };
}
function safeProject(item) {
  return { id: idOf(item), title: item.title, description: item.description || "", category: item.category || "", role: item.role || "", technologies: item.technologies || [], startDate: item.startDate || "", endDate: item.endDate || "", ongoing: Boolean(item.ongoing), githubUrl: item.githubUrl || "", liveUrl: item.liveUrl || "", contributions: item.contributions || [], outcomes: item.outcomes || [], imageUrl: item.imageUrl || "" };
}
function safeCertification(item) {
  return { id: idOf(item), name: item.name, issuer: item.issuer, issueDate: item.issueDate || "", expiryDate: item.expiryDate || "", credentialId: item.credentialId || "", verificationUrl: item.verificationUrl || "", relatedSkills: item.relatedSkills || [], certificateUrl: item.certificateUrl || "" };
}
function safeExperience(item) {
  return { id: idOf(item), organization: item.organization, position: item.position, experienceType: item.experienceType, description: item.description || "", startDate: item.startDate || "", endDate: item.endDate || "", currentlyWorking: Boolean(item.currentlyWorking), location: item.location || "", skillsUsed: item.skillsUsed || [], responsibilities: item.responsibilities || [], achievements: item.achievements || [] };
}

function buildPortfolioProjection({ user, bundle, settings }) {
  const profile = bundle.data.profile || {};
  const visible = new Set(settings.visibleSections || []);
  const sections = {};
  if (visible.has("about")) sections.about = {
    headline: profile.personal?.headline || "",
    summary: profile.personal?.summary || "",
    location: [profile.personal?.city, profile.personal?.country].filter(Boolean).join(", "),
  };
  if (visible.has("education")) sections.education = (profile.education || []).map(safeEducation);
  if (visible.has("skills")) sections.skills = (bundle.data.skills || []).map((item) => ({
    id: idOf(item.skillId), name: item.skillId?.name || "Skill", category: item.skillId?.category || "",
    proficiency: item.proficiency, evidenceStatus: item.evidenceStatus,
    supportingEvidenceCount: (item.evidenceReferences || []).length,
  }));
  if (visible.has("projects")) sections.projects = (profile.projects || []).map(safeProject);
  if (visible.has("certifications")) sections.certifications = (profile.certifications || []).map(safeCertification);
  if (visible.has("experience")) sections.experience = (profile.experience || []).map(safeExperience);
  if (visible.has("career_interests")) {
    const preferences = profile.preferences || {};
    sections.careerInterests = {
      preferredRoles: preferences.preferredRoles || [], preferredIndustries: preferences.preferredIndustries || [],
      careerInterests: preferences.careerInterests || [], workModes: preferences.workModes || [],
      employmentTypes: preferences.employmentTypes || [], areasToExplore: preferences.areasToExplore || [],
      shortTermObjective: preferences.shortTermObjective || "", longTermObjective: preferences.longTermObjective || "",
    };
  }
  if (visible.has("achievements")) {
    const selected = new Set(settings.selectedAchievementKeys || []);
    sections.achievements = bundle.achievements.filter((item) => selected.has(item.key)).map(({ key, title, description, date, module }) => ({ key, title, description, date, module }));
  }
  return {
    name: user.name,
    publicSlug: settings.publicSlug || null,
    visibleSections: PORTFOLIO_SECTIONS.filter((section) => visible.has(section)),
    sections,
    updatedAt: settings.updatedAt || profile.updatedAt || null,
  };
}

async function getSettings(userId) {
  return PortfolioSettings.findOne({ userId });
}

async function uniqueSlug(base, excludeUserId = null) {
  const root = publicSlugFromName(base);
  for (let index = 0; index < 100; index += 1) {
    const suffix = index ? `-${index + 1}` : "";
    const candidate = `${root.slice(0, 60 - suffix.length)}${suffix}`;
    const existing = await PortfolioSettings.findOne({ publicSlug: candidate }).select("userId").lean();
    if (!existing || (excludeUserId && String(existing.userId) === String(excludeUserId))) return candidate;
  }
  throw new AppError(409, "PORTFOLIO_SLUG_UNAVAILABLE", "Choose a different public portfolio slug");
}

async function saveSettings(settings) {
  try { return await settings.save(); }
  catch (error) {
    if (error?.code === 11000) throw new AppError(409, "PORTFOLIO_SLUG_TAKEN", "That public portfolio slug is already in use");
    throw error;
  }
}

async function getStudentPortfolio(userId) {
  const [user, bundle, settings] = await Promise.all([User.findById(userId).select("name").lean(), getProgressBundle(userId), getSettings(userId)]);
  if (!user) throw new AppError(404, "USER_NOT_FOUND", "Student account was not found");
  const safeSettings = presentSettings(settings);
  return { settings: safeSettings, availableSections: PORTFOLIO_SECTIONS, availableAchievements: bundle.achievements, portfolio: buildPortfolioProjection({ user, bundle, settings: safeSettings }) };
}

async function updatePortfolioContent(userId, values) {
  const bundle = await getProgressBundle(userId);
  const available = new Set(bundle.achievements.map((item) => item.key));
  if (values.selectedAchievementKeys.some((key) => !available.has(key))) throw new AppError(400, "PORTFOLIO_ACHIEVEMENT_INVALID", "Every selected achievement must come from the student's current Futurion records");
  let settings = await getSettings(userId);
  if (!settings) settings = new PortfolioSettings({ userId });
  settings.visibleSections = values.visibleSections;
  settings.selectedAchievementKeys = values.selectedAchievementKeys;
  await saveSettings(settings);
  return getStudentPortfolio(userId);
}

async function publishPortfolio(userId, values) {
  const user = await User.findById(userId).select("name").lean();
  if (!user) throw new AppError(404, "USER_NOT_FOUND", "Student account was not found");
  let settings = await getSettings(userId);
  if (!settings) settings = new PortfolioSettings({ userId });
  settings.publicSlug = await uniqueSlug(values.publicSlug || settings.publicSlug || user.name, userId);
  settings.isPublic = true;
  await saveSettings(settings);
  return getStudentPortfolio(userId);
}

async function updatePublicSettings(userId, values) {
  const user = await User.findById(userId).select("name").lean();
  if (!user) throw new AppError(404, "USER_NOT_FOUND", "Student account was not found");
  let settings = await getSettings(userId);
  if (!settings) settings = new PortfolioSettings({ userId });
  if (values.publicSlug !== undefined) settings.publicSlug = await uniqueSlug(values.publicSlug, userId);
  if (values.isPublic !== undefined) settings.isPublic = values.isPublic;
  if (settings.isPublic && !settings.publicSlug) settings.publicSlug = await uniqueSlug(user.name, userId);
  await saveSettings(settings);
  return getStudentPortfolio(userId);
}

async function getPublicPortfolio(publicSlug) {
  const settings = await PortfolioSettings.findOne({ publicSlug, isPublic: true }).lean();
  if (!settings) throw new AppError(404, "PUBLIC_PORTFOLIO_NOT_FOUND", "Public portfolio was not found");
  const [user, bundle] = await Promise.all([User.findById(settings.userId).select("name isActive").lean(), getProgressBundle(settings.userId)]);
  if (!user?.isActive) throw new AppError(404, "PUBLIC_PORTFOLIO_NOT_FOUND", "Public portfolio was not found");
  return buildPortfolioProjection({ user, bundle, settings });
}

module.exports = {
  buildPortfolioProjection,
  getPublicPortfolio,
  getSettings,
  getStudentPortfolio,
  presentSettings,
  publishPortfolio,
  uniqueSlug,
  updatePortfolioContent,
  updatePublicSettings,
};
