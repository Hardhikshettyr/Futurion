const { z } = require("zod");

const cleanString = (max) => z.string().trim().max(max);
const requiredString = (max, message) => cleanString(max).min(1, message);
const optionalUrl = z.union([z.literal(""), z.url("Enter a valid URL")]);
const stringList = (maxItems = 30, maxLength = 160) =>
  z.array(cleanString(maxLength).min(1)).max(maxItems).default([]);
const optionalYear = z.union([z.null(), z.int().min(1950).max(2100)]).default(null);
const monthValue = z.union([
  z.literal(""),
  z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Use YYYY-MM format"),
]);

const personalSchema = z.strictObject({
  name: requiredString(150, "Name is required").optional(),
  phone: cleanString(30).optional(),
  city: cleanString(100).optional(),
  state: cleanString(100).optional(),
  country: cleanString(100).optional(),
  headline: cleanString(180).optional(),
  summary: cleanString(2000).optional(),
  linkedInUrl: optionalUrl.optional(),
  githubUrl: optionalUrl.optional(),
  portfolioUrl: optionalUrl.optional(),
});

const educationRecordSchema = z.strictObject({
  institution: requiredString(200, "Institution is required"),
  degree: cleanString(160).default(""),
  academicDiscipline: cleanString(120).default(""),
  specialization: cleanString(160).default(""),
  educationLevel: cleanString(80).default(""),
  startYear: optionalYear,
  graduationYear: optionalYear,
  currentStatus: z.enum(["currently_studying", "completed", "paused", "discontinued", ""]).default(""),
  gradingType: z.enum(["cgpa", "gpa", "percentage", "grade", "other", "not_applicable", ""]).default(""),
  gradeValue: cleanString(30).default(""),
  gradingScale: cleanString(30).default(""),
  location: cleanString(180).default(""),
  relevantCoursework: stringList(30, 120),
  academicAchievements: stringList(20, 300),
});

const skillRecordSchema = z.strictObject({
  name: requiredString(100, "Skill name is required"),
  category: z.enum(["technical", "nontechnical", "transferable", "domain_specific"]),
  proficiency: z.enum(["beginner", "intermediate", "advanced", "expert"]),
  evidenceStatus: z.enum(["self_declared", "currently_learning", "demonstrated"]).default("self_declared"),
  description: cleanString(600).default(""),
  associatedProject: cleanString(180).default(""),
  associatedCertification: cleanString(180).default(""),
});

const projectRecordSchema = z.strictObject({
  title: requiredString(180, "Project title is required"),
  description: cleanString(2000).default(""),
  category: cleanString(100).default(""),
  role: cleanString(160).default(""),
  technologies: stringList(30, 100),
  startDate: monthValue.default(""),
  endDate: monthValue.default(""),
  ongoing: z.boolean().default(false),
  githubUrl: optionalUrl.default(""),
  liveUrl: optionalUrl.default(""),
  contributions: stringList(20, 400),
  outcomes: stringList(20, 400),
  imageUrl: optionalUrl.default(""),
});

const experienceRecordSchema = z.strictObject({
  organization: requiredString(200, "Organization is required"),
  position: requiredString(180, "Position is required"),
  experienceType: z.enum(["internship", "full_time", "part_time", "freelance", "volunteering", "research", "other"]),
  description: cleanString(2000).default(""),
  startDate: monthValue.default(""),
  endDate: monthValue.default(""),
  currentlyWorking: z.boolean().default(false),
  location: cleanString(180).default(""),
  skillsUsed: stringList(30, 100),
  responsibilities: stringList(20, 400),
  achievements: stringList(20, 400),
});

const certificationRecordSchema = z.strictObject({
  name: requiredString(200, "Certification name is required"),
  issuer: requiredString(200, "Issuer is required"),
  issueDate: monthValue.default(""),
  expiryDate: monthValue.default(""),
  credentialId: cleanString(180).default(""),
  verificationUrl: optionalUrl.default(""),
  relatedSkills: stringList(30, 100),
  certificateUrl: optionalUrl.default(""),
});

const preferencesSchema = z.strictObject({
  preferredRoles: stringList(20, 120).optional(),
  preferredIndustries: stringList(20, 120).optional(),
  careerInterests: stringList(30, 160).optional(),
  workModes: z.array(z.enum(["remote", "hybrid", "on_site"])).max(3).optional(),
  employmentTypes: stringList(15, 80).optional(),
  preferredLocations: stringList(20, 160).optional(),
  willingToRelocate: z.boolean().optional(),
  areasToExplore: stringList(30, 160).optional(),
  shortTermObjective: cleanString(1000).optional(),
  longTermObjective: cleanString(1000).optional(),
});

const arrayBody = (key, schema, max) =>
  z.strictObject({ [key]: z.array(schema).max(max) });

const nullableText = z.union([z.string().trim().max(2000), z.null()]);
const nullableShortText = z.union([z.string().trim().max(500), z.null()]);
const nullableYear = z.union([z.int().min(1950).max(2100), z.null()]);
const nullableBoolean = z.union([z.boolean(), z.null()]);
const nullableList = z.array(z.string().trim().max(400)).max(30);

const extractedPersonalSchema = z.strictObject({
  fullName: nullableShortText,
  phone: nullableShortText,
  city: nullableShortText,
  country: nullableShortText,
  headline: nullableShortText,
  summary: nullableText,
  linkedInUrl: nullableShortText,
  githubUrl: nullableShortText,
  portfolioUrl: nullableShortText,
});

const extractedEducationSchema = z.strictObject({
  institution: nullableShortText,
  degree: nullableShortText,
  academicDiscipline: nullableShortText,
  specialization: nullableShortText,
  educationLevel: nullableShortText,
  startYear: nullableYear,
  graduationYear: nullableYear,
  currentStatus: z.union([z.enum(["currently_studying", "completed", "paused", "discontinued"]), z.null()]),
  gradingType: z.union([z.enum(["cgpa", "gpa", "percentage", "grade", "other", "not_applicable"]), z.null()]),
  gradeValue: nullableShortText,
  gradingScale: nullableShortText,
  location: nullableShortText,
  relevantCoursework: nullableList,
  academicAchievements: nullableList,
});

const extractedSkillSchema = z.strictObject({
  name: nullableShortText,
  category: z.union([z.enum(["technical", "nontechnical", "transferable", "domain_specific"]), z.null()]),
  proficiency: z.union([z.enum(["beginner", "intermediate", "advanced", "expert"]), z.null()]),
  description: nullableText,
});

const extractedProjectSchema = z.strictObject({
  title: nullableShortText,
  description: nullableText,
  category: nullableShortText,
  role: nullableShortText,
  technologies: nullableList,
  startDate: nullableShortText,
  endDate: nullableShortText,
  ongoing: nullableBoolean,
  githubUrl: nullableShortText,
  liveUrl: nullableShortText,
  contributions: nullableList,
  outcomes: nullableList,
});

const extractedExperienceSchema = z.strictObject({
  organization: nullableShortText,
  position: nullableShortText,
  experienceType: z.union([z.enum(["internship", "full_time", "part_time", "freelance", "volunteering", "research", "other"]), z.null()]),
  description: nullableText,
  startDate: nullableShortText,
  endDate: nullableShortText,
  currentlyWorking: nullableBoolean,
  location: nullableShortText,
  skillsUsed: nullableList,
  responsibilities: nullableList,
  achievements: nullableList,
});

const extractedCertificationSchema = z.strictObject({
  name: nullableShortText,
  issuer: nullableShortText,
  issueDate: nullableShortText,
  expiryDate: nullableShortText,
  credentialId: nullableShortText,
  verificationUrl: nullableShortText,
});

const resumeExtractionSchema = z.strictObject({
  personal: extractedPersonalSchema,
  education: z.array(extractedEducationSchema).max(20),
  skills: z.array(extractedSkillSchema).max(100),
  projects: z.array(extractedProjectSchema).max(30),
  experience: z.array(extractedExperienceSchema).max(30),
  certifications: z.array(extractedCertificationSchema).max(40),
  warnings: z.array(z.string().trim().max(300)).max(30),
});

const importSelectionSchema = z.strictObject({
  personal: z.array(z.enum(["fullName", "phone", "city", "country", "headline", "summary", "linkedInUrl", "githubUrl", "portfolioUrl"])).max(9),
  education: z.array(z.int().min(0)).max(20),
  skills: z.array(z.int().min(0)).max(100),
  projects: z.array(z.int().min(0)).max(30),
  experience: z.array(z.int().min(0)).max(30),
  certifications: z.array(z.int().min(0)).max(40),
});

const resumeImportSchema = z.strictObject({
  data: resumeExtractionSchema,
  selection: importSelectionSchema,
});

module.exports = {
  certificationRecordSchema,
  educationRecordSchema,
  personalSchema,
  preferencesSchema,
  projectRecordSchema,
  resumeExtractionSchema,
  resumeImportSchema,
  schemas: {
    personal: personalSchema,
    education: arrayBody("education", educationRecordSchema, 20),
    skills: arrayBody("skills", skillRecordSchema, 100),
    projects: arrayBody("projects", projectRecordSchema, 30),
    experience: arrayBody("experience", experienceRecordSchema, 30),
    certifications: arrayBody("certifications", certificationRecordSchema, 40),
    preferences: preferencesSchema,
  },
  skillRecordSchema,
  experienceRecordSchema,
};
