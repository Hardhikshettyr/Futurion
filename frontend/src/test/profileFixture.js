const profileFixture = {
  id: "profile-1",
  personal: {
    name: "Ada Lovelace",
    email: "ada@example.com",
    phone: "",
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
    headline: "Student researcher",
    summary: "I build thoughtful education tools.",
    linkedInUrl: "",
    githubUrl: "",
    portfolioUrl: "",
    photo: null,
  },
  education: [],
  skills: [],
  projects: [],
  experience: [],
  certifications: [],
  preferences: {
    preferredRoles: [], preferredIndustries: [], careerInterests: [], workModes: [],
    employmentTypes: [], preferredLocations: [], willingToRelocate: false,
    areasToExplore: [], shortTermObjective: "", longTermObjective: "",
  },
  resume: null,
  capabilities: { resumeParsingAvailable: false },
  completeness: {
    overall: 18,
    suggestions: ["Add your current education."],
    sections: Object.fromEntries(
      ["personal", "education", "skills", "projects", "experience", "certifications", "preferences", "resume"].map((key) => [key, { label: key[0].toUpperCase() + key.slice(1), percentage: key === "personal" ? 70 : 0, missingFields: [], suggestions: [`Complete ${key}.`] }]),
    ),
  },
};

export default profileFixture;
