const librarySkill = {
  id: "507f1f77bcf86cd799439012",
  name: "Critical Thinking",
  slug: "critical-thinking",
  description: "Evaluate claims and evidence before reaching a conclusion.",
  category: "transferable",
  subcategory: "Reasoning",
  aliases: ["Critical Reasoning"],
  parentSkillId: null,
  relatedSkills: [],
  prerequisites: [],
  difficultyLevel: "foundational",
  status: "active",
};

const studentSkill = {
  id: "507f1f77bcf86cd799439013",
  skill: librarySkill,
  proficiency: "beginner",
  evidenceStatus: "currently_learning",
  learningStatus: "learning",
  confidenceLevel: 2,
  description: "Practicing evidence evaluation.",
  evidence: [],
  evidenceCount: 0,
  notes: "",
  updatedAt: "2026-11-07T10:00:00.000Z",
};

const dependencyFixture = {
  skill: librarySkill,
  prerequisites: [],
  relatedSkills: [],
  dependents: [],
  missingPrerequisites: [],
  recommendedNextSkills: [],
  trackedSkillIds: [librarySkill.id],
  tree: { id: librarySkill.id, name: librarySkill.name, category: librarySkill.category, difficultyLevel: "foundational", isTracked: true, prerequisites: [] },
};

export { dependencyFixture, librarySkill, studentSkill };
