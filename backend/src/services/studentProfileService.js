const StudentProfile = require("../models/StudentProfile");
const User = require("../models/User");
const { calculateProfileCompleteness, meaningful } = require("./profileCompletenessService");
const {
  deletePrivateFile,
  savePrivateFile,
} = require("./storageService");
const {
  certificationRecordSchema,
  educationRecordSchema,
  experienceRecordSchema,
  projectRecordSchema,
  skillRecordSchema,
} = require("../validators/studentProfileSchemas");

const PRIVATE_FILE_SELECTION =
  "+personal.photo.storageKey +personal.photo.contentHash +resume.storageKey +resume.contentHash";

function plainRecord(record) {
  const value = record?.toObject ? record.toObject() : { ...record };
  if (value._id) {
    value.id = value._id.toString();
    delete value._id;
  }
  delete value.__v;
  return value;
}

function safeFile(file, endpoint) {
  if (!file?.filename) return null;
  return {
    filename: file.filename,
    mimeType: file.mimeType,
    size: file.size,
    uploadedAt: file.uploadedAt,
    lastParsedAt: file.lastParsedAt || null,
    endpoint,
  };
}

function aiCapabilities() {
  return {
    resumeParsingAvailable: Boolean(
      process.env.GEMINI_API_KEY && process.env.GEMINI_MODEL,
    ),
  };
}

function presentStudentProfile(profile, user) {
  const source = profile?.toObject ? profile.toObject() : profile;
  const personal = { ...(source.personal || {}) };
  delete personal.photo?.storageKey;
  delete personal.photo?.contentHash;

  return {
    id: source._id.toString(),
    personal: {
      name: user.name,
      email: user.email,
      phone: personal.phone || "",
      city: personal.city || "",
      state: personal.state || "",
      country: personal.country || "",
      headline: personal.headline || "",
      summary: personal.summary || "",
      linkedInUrl: personal.linkedInUrl || "",
      githubUrl: personal.githubUrl || "",
      portfolioUrl: personal.portfolioUrl || "",
      photo: safeFile(source.personal?.photo, "/student/profile/photo"),
    },
    education: (source.education || []).map(plainRecord),
    skills: (source.skills || []).map(plainRecord),
    projects: (source.projects || []).map(plainRecord),
    experience: (source.experience || []).map(plainRecord),
    certifications: (source.certifications || []).map(plainRecord),
    preferences: plainRecord(source.preferences || {}),
    resume: safeFile(source.resume, "/student/profile/resume"),
    completeness: calculateProfileCompleteness(source, user),
    capabilities: aiCapabilities(),
    createdAt: source.createdAt,
    updatedAt: source.updatedAt,
  };
}

async function getOrCreateStudentProfile(userId) {
  try {
    return await StudentProfile.findOneAndUpdate(
      { userId },
      { $setOnInsert: { userId } },
      {
        upsert: true,
        returnDocument: "after",
        setDefaultsOnInsert: true,
      },
    ).select(PRIVATE_FILE_SELECTION);
  } catch (error) {
    if (error?.code !== 11000) throw error;
    return StudentProfile.findOne({ userId }).select(PRIVATE_FILE_SELECTION);
  }
}

async function updatePersonal({ profile, user, values }) {
  const { name, ...personalValues } = values;
  Object.assign(profile.personal, personalValues);
  if (name !== undefined && name !== user.name) {
    await User.updateOne({ _id: user._id }, { $set: { name } });
    user.name = name;
  }
  await profile.save();
  return presentStudentProfile(profile, user);
}

async function replaceSection({ profile, section, values, user }) {
  profile[section] = values;
  await profile.save();
  return presentStudentProfile(profile, user);
}

async function updatePreferences({ profile, user, values }) {
  Object.assign(profile.preferences, values);
  await profile.save();
  return presentStudentProfile(profile, user);
}

async function replaceProfileFile({
  buffer,
  fileInfo,
  kind,
  profile,
  user,
}) {
  const storageKey = await savePrivateFile({
    buffer,
    extension: fileInfo.extension,
    kind,
    userId: user._id,
  });
  const previous = kind === "photo" ? profile.personal.photo : profile.resume;
  const metadata = {
    storageKey,
    filename: fileInfo.filename,
    mimeType: fileInfo.mimeType,
    size: buffer.length,
    contentHash: fileInfo.contentHash,
    uploadedAt: new Date(),
    lastParsedAt: null,
  };

  try {
    if (kind === "photo") profile.personal.photo = metadata;
    else profile.resume = metadata;
    await profile.save();
  } catch (error) {
    await deletePrivateFile(storageKey);
    throw error;
  }

  await deletePrivateFile(previous?.storageKey);
  return presentStudentProfile(profile, user);
}

async function removeProfileFile({ kind, profile, user }) {
  const previous = kind === "photo" ? profile.personal.photo : profile.resume;
  if (kind === "photo") profile.personal.photo = null;
  else profile.resume = null;
  await profile.save();
  await deletePrivateFile(previous?.storageKey);
  return presentStudentProfile(profile, user);
}

function cleanText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function cleanMonth(value) {
  const text = cleanText(value);
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(text) ? text : "";
}

function cleanUrl(value) {
  const text = cleanText(value);
  if (!text) return "";
  try {
    const parsed = new URL(text);
    return ["http:", "https:"].includes(parsed.protocol) ? parsed.toString() : "";
  } catch {
    return "";
  }
}

function cleanList(value) {
  return Array.isArray(value)
    ? value.map(cleanText).filter(meaningful)
    : [];
}

function selectedRecords(records, indexes) {
  return [...new Set(indexes)]
    .map((index) => records[index])
    .filter(Boolean);
}

function appendUnique(existing, incoming, keySelector) {
  const keys = new Set(existing.map((record) => keySelector(record).toLowerCase()));
  let appended = 0;
  for (const record of incoming) {
    const key = keySelector(record).toLowerCase();
    if (key && !keys.has(key)) {
      existing.push(record);
      keys.add(key);
      appended += 1;
    }
  }
  return appended;
}

function parseValid(schema, candidate) {
  const result = schema.safeParse(candidate);
  return result.success ? result.data : null;
}

async function importResumeSelection({ profile, user, data, selection }) {
  const imported = {
    personal: 0,
    education: 0,
    skills: 0,
    projects: 0,
    experience: 0,
    certifications: 0,
  };

  const personalMap = {
    phone: "phone",
    city: "city",
    country: "country",
    headline: "headline",
    summary: "summary",
    linkedInUrl: "linkedInUrl",
    githubUrl: "githubUrl",
    portfolioUrl: "portfolioUrl",
  };
  let selectedName = null;
  for (const field of new Set(selection.personal)) {
    const value = data.personal[field];
    if (!meaningful(value)) continue;
    if (field === "fullName") {
      selectedName = cleanText(value).slice(0, 150);
      imported.personal += 1;
    } else if (personalMap[field]) {
      const cleanValue = field.toLowerCase().includes("url")
        ? cleanUrl(value)
        : cleanText(value);
      if (cleanValue) {
        profile.personal[personalMap[field]] = cleanValue;
        imported.personal += 1;
      }
    }
  }

  const education = selectedRecords(data.education, selection.education)
    .map((item) =>
      parseValid(educationRecordSchema, {
        institution: cleanText(item.institution),
        degree: cleanText(item.degree),
        academicDiscipline: cleanText(item.academicDiscipline),
        specialization: cleanText(item.specialization),
        educationLevel: cleanText(item.educationLevel),
        startYear: item.startYear,
        graduationYear: item.graduationYear,
        currentStatus: item.currentStatus || "",
        gradingType: item.gradingType || "",
        gradeValue: cleanText(item.gradeValue),
        gradingScale: cleanText(item.gradingScale),
        location: cleanText(item.location),
        relevantCoursework: cleanList(item.relevantCoursework),
        academicAchievements: cleanList(item.academicAchievements),
      }),
    )
    .filter(Boolean);
  imported.education = appendUnique(
    profile.education,
    education,
    (item) => `${item.institution}:${item.degree}`,
  );

  const skills = selectedRecords(data.skills, selection.skills)
    .map((item) =>
      parseValid(skillRecordSchema, {
        name: cleanText(item.name),
        category: item.category,
        proficiency: item.proficiency,
        evidenceStatus: "self_declared",
        description: cleanText(item.description),
        associatedProject: "",
        associatedCertification: "",
      }),
    )
    .filter(Boolean);
  imported.skills = appendUnique(profile.skills, skills, (item) => item.name);

  const projects = selectedRecords(data.projects, selection.projects)
    .map((item) =>
      parseValid(projectRecordSchema, {
        title: cleanText(item.title),
        description: cleanText(item.description),
        category: cleanText(item.category),
        role: cleanText(item.role),
        technologies: cleanList(item.technologies),
        startDate: cleanMonth(item.startDate),
        endDate: cleanMonth(item.endDate),
        ongoing: Boolean(item.ongoing),
        githubUrl: cleanUrl(item.githubUrl),
        liveUrl: cleanUrl(item.liveUrl),
        contributions: cleanList(item.contributions),
        outcomes: cleanList(item.outcomes),
        imageUrl: "",
      }),
    )
    .filter(Boolean);
  imported.projects = appendUnique(profile.projects, projects, (item) => item.title);

  const experience = selectedRecords(data.experience, selection.experience)
    .map((item) =>
      parseValid(experienceRecordSchema, {
        organization: cleanText(item.organization),
        position: cleanText(item.position),
        experienceType: item.experienceType,
        description: cleanText(item.description),
        startDate: cleanMonth(item.startDate),
        endDate: cleanMonth(item.endDate),
        currentlyWorking: Boolean(item.currentlyWorking),
        location: cleanText(item.location),
        skillsUsed: cleanList(item.skillsUsed),
        responsibilities: cleanList(item.responsibilities),
        achievements: cleanList(item.achievements),
      }),
    )
    .filter(Boolean);
  imported.experience = appendUnique(
    profile.experience,
    experience,
    (item) => `${item.organization}:${item.position}`,
  );

  const certifications = selectedRecords(
    data.certifications,
    selection.certifications,
  )
    .map((item) =>
      parseValid(certificationRecordSchema, {
        name: cleanText(item.name),
        issuer: cleanText(item.issuer),
        issueDate: cleanMonth(item.issueDate),
        expiryDate: cleanMonth(item.expiryDate),
        credentialId: cleanText(item.credentialId),
        verificationUrl: cleanUrl(item.verificationUrl),
        relatedSkills: [],
        certificateUrl: "",
      }),
    )
    .filter(Boolean);
  imported.certifications = appendUnique(
    profile.certifications,
    certifications,
    (item) => `${item.name}:${item.issuer}`,
  );

  if (selectedName && selectedName !== user.name) {
    await User.updateOne({ _id: user._id }, { $set: { name: selectedName } });
    user.name = selectedName;
  }
  await profile.save();
  return { imported, profile: presentStudentProfile(profile, user) };
}

module.exports = {
  PRIVATE_FILE_SELECTION,
  getOrCreateStudentProfile,
  importResumeSelection,
  presentStudentProfile,
  removeProfileFile,
  replaceProfileFile,
  replaceSection,
  updatePersonal,
  updatePreferences,
};
