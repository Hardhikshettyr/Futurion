const mongoose = require("mongoose");

const { Schema } = mongoose;

const fileMetadataSchema = new Schema(
  {
    storageKey: { type: String, required: true, select: false },
    filename: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true, min: 1 },
    contentHash: { type: String, required: true, select: false },
    uploadedAt: { type: Date, required: true, default: Date.now },
    lastParsedAt: { type: Date, default: null },
  },
  { _id: false },
);

const personalSchema = new Schema(
  {
    phone: { type: String, trim: true, maxlength: 30, default: "" },
    city: { type: String, trim: true, maxlength: 100, default: "" },
    state: { type: String, trim: true, maxlength: 100, default: "" },
    country: { type: String, trim: true, maxlength: 100, default: "" },
    headline: { type: String, trim: true, maxlength: 180, default: "" },
    summary: { type: String, trim: true, maxlength: 2000, default: "" },
    linkedInUrl: { type: String, trim: true, maxlength: 500, default: "" },
    githubUrl: { type: String, trim: true, maxlength: 500, default: "" },
    portfolioUrl: { type: String, trim: true, maxlength: 500, default: "" },
    photo: { type: fileMetadataSchema, default: null },
  },
  { _id: false },
);

const educationSchema = new Schema({
  institution: { type: String, trim: true, maxlength: 200, required: true },
  degree: { type: String, trim: true, maxlength: 160, default: "" },
  academicDiscipline: { type: String, trim: true, maxlength: 120, default: "" },
  specialization: { type: String, trim: true, maxlength: 160, default: "" },
  educationLevel: { type: String, trim: true, maxlength: 80, default: "" },
  startYear: { type: Number, min: 1950, max: 2100, default: null },
  graduationYear: { type: Number, min: 1950, max: 2100, default: null },
  currentStatus: {
    type: String,
    enum: ["currently_studying", "completed", "paused", "discontinued", ""],
    default: "",
  },
  gradingType: {
    type: String,
    enum: ["cgpa", "gpa", "percentage", "grade", "other", "not_applicable", ""],
    default: "",
  },
  gradeValue: { type: String, trim: true, maxlength: 30, default: "" },
  gradingScale: { type: String, trim: true, maxlength: 30, default: "" },
  location: { type: String, trim: true, maxlength: 180, default: "" },
  relevantCoursework: [{ type: String, trim: true, maxlength: 120 }],
  academicAchievements: [{ type: String, trim: true, maxlength: 300 }],
});

const skillSchema = new Schema({
  name: { type: String, trim: true, maxlength: 100, required: true },
  category: {
    type: String,
    enum: ["technical", "nontechnical", "transferable", "domain_specific"],
    required: true,
  },
  proficiency: {
    type: String,
    enum: ["beginner", "intermediate", "advanced", "expert"],
    required: true,
  },
  evidenceStatus: {
    type: String,
    enum: ["self_declared", "currently_learning", "demonstrated", "verified"],
    default: "self_declared",
  },
  description: { type: String, trim: true, maxlength: 600, default: "" },
  associatedProject: { type: String, trim: true, maxlength: 180, default: "" },
  associatedCertification: { type: String, trim: true, maxlength: 180, default: "" },
});

const projectSchema = new Schema({
  title: { type: String, trim: true, maxlength: 180, required: true },
  description: { type: String, trim: true, maxlength: 2000, default: "" },
  category: { type: String, trim: true, maxlength: 100, default: "" },
  role: { type: String, trim: true, maxlength: 160, default: "" },
  technologies: [{ type: String, trim: true, maxlength: 100 }],
  startDate: { type: String, trim: true, maxlength: 10, default: "" },
  endDate: { type: String, trim: true, maxlength: 10, default: "" },
  ongoing: { type: Boolean, default: false },
  githubUrl: { type: String, trim: true, maxlength: 500, default: "" },
  liveUrl: { type: String, trim: true, maxlength: 500, default: "" },
  contributions: [{ type: String, trim: true, maxlength: 400 }],
  outcomes: [{ type: String, trim: true, maxlength: 400 }],
  imageUrl: { type: String, trim: true, maxlength: 500, default: "" },
});

const experienceSchema = new Schema({
  organization: { type: String, trim: true, maxlength: 200, required: true },
  position: { type: String, trim: true, maxlength: 180, required: true },
  experienceType: {
    type: String,
    enum: ["internship", "full_time", "part_time", "freelance", "volunteering", "research", "other"],
    required: true,
  },
  description: { type: String, trim: true, maxlength: 2000, default: "" },
  startDate: { type: String, trim: true, maxlength: 10, default: "" },
  endDate: { type: String, trim: true, maxlength: 10, default: "" },
  currentlyWorking: { type: Boolean, default: false },
  location: { type: String, trim: true, maxlength: 180, default: "" },
  skillsUsed: [{ type: String, trim: true, maxlength: 100 }],
  responsibilities: [{ type: String, trim: true, maxlength: 400 }],
  achievements: [{ type: String, trim: true, maxlength: 400 }],
});

const certificationSchema = new Schema({
  name: { type: String, trim: true, maxlength: 200, required: true },
  issuer: { type: String, trim: true, maxlength: 200, required: true },
  issueDate: { type: String, trim: true, maxlength: 10, default: "" },
  expiryDate: { type: String, trim: true, maxlength: 10, default: "" },
  credentialId: { type: String, trim: true, maxlength: 180, default: "" },
  verificationUrl: { type: String, trim: true, maxlength: 500, default: "" },
  relatedSkills: [{ type: String, trim: true, maxlength: 100 }],
  certificateUrl: { type: String, trim: true, maxlength: 500, default: "" },
});

const preferencesSchema = new Schema(
  {
    preferredRoles: [{ type: String, trim: true, maxlength: 120 }],
    preferredIndustries: [{ type: String, trim: true, maxlength: 120 }],
    careerInterests: [{ type: String, trim: true, maxlength: 160 }],
    workModes: [{ type: String, enum: ["remote", "hybrid", "on_site"] }],
    employmentTypes: [{ type: String, trim: true, maxlength: 80 }],
    preferredLocations: [{ type: String, trim: true, maxlength: 160 }],
    willingToRelocate: { type: Boolean, default: false },
    areasToExplore: [{ type: String, trim: true, maxlength: 160 }],
    shortTermObjective: { type: String, trim: true, maxlength: 1000, default: "" },
    longTermObjective: { type: String, trim: true, maxlength: 1000, default: "" },
  },
  { _id: false },
);

const studentProfileSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    personal: { type: personalSchema, default: () => ({}) },
    education: { type: [educationSchema], default: [] },
    skills: { type: [skillSchema], default: [] },
    projects: { type: [projectSchema], default: [] },
    experience: { type: [experienceSchema], default: [] },
    certifications: { type: [certificationSchema], default: [] },
    preferences: { type: preferencesSchema, default: () => ({}) },
    resume: { type: fileMetadataSchema, default: null },
  },
  { timestamps: true },
);

module.exports = mongoose.model("StudentProfile", studentProfileSchema);
