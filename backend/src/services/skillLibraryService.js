const mongoose = require("mongoose");
const Skill = require("../models/Skill");
const AppError = require("../utils/AppError");
const {
  cleanSkillLabel,
  normalizeSkillIdentity,
  skillSlug,
} = require("../utils/skillTaxonomy");

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function presentSkill(skill) {
  if (!skill) return null;
  const source = skill.toObject ? skill.toObject() : skill;
  return {
    id: String(source._id),
    name: source.name,
    slug: source.slug,
    description: source.description || "",
    category: source.category,
    subcategory: source.subcategory || "",
    aliases: source.aliases || [],
    parentSkillId: source.parentSkillId ? String(source.parentSkillId) : null,
    relatedSkills: (source.relatedSkills || []).map(String),
    prerequisites: (source.prerequisites || []).map(String),
    prerequisiteRules: (source.prerequisiteRules || []).map((rule) => ({
      skillId: String(rule.skillId),
      importance: rule.importance || "essential",
      minimumProficiency: rule.minimumProficiency || "beginner",
      requiredForLevels: rule.requiredForLevels || [],
    })),
    difficultyLevel: source.difficultyLevel,
    status: source.status,
    createdAt: source.createdAt,
    updatedAt: source.updatedAt,
  };
}

async function listSkills(query, { includeInactive = false } = {}) {
  const filter = {};
  filter.status = includeInactive && query.status ? query.status : "active";
  if (query.category) filter.category = query.category;
  if (query.subcategory) {
    filter.subcategory = new RegExp(`^${escapeRegex(query.subcategory)}$`, "i");
  }
  if (query.q) {
    const search = new RegExp(escapeRegex(query.q), "i");
    filter.$or = [{ name: search }, { aliases: search }, { description: search }];
  }

  const skip = (query.page - 1) * query.limit;
  const [items, total] = await Promise.all([
    Skill.find(filter).sort({ name: 1 }).skip(skip).limit(query.limit).lean(),
    Skill.countDocuments(filter),
  ]);

  return {
    items: items.map(presentSkill),
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.limit)),
    },
  };
}

async function findSkill(skillId, { activeOnly = true } = {}) {
  const filter = { _id: skillId };
  if (activeOnly) filter.status = "active";
  const skill = await Skill.findOne(filter).lean();
  if (!skill) {
    throw new AppError(404, "SKILL_NOT_FOUND", "Skill was not found");
  }
  return skill;
}

async function assertIdentityAvailable({ name, aliases = [], excludeId = null }) {
  const identities = [...new Set([name, ...aliases].map(normalizeSkillIdentity).filter(Boolean))];
  if (identities.length !== 1 + new Set(aliases.map(normalizeSkillIdentity)).size) {
    throw new AppError(409, "SKILL_IDENTITY_DUPLICATE", "Skill name and aliases must be unique");
  }
  const filter = {
    $or: [
      { normalizedName: { $in: identities } },
      { normalizedAliases: { $in: identities } },
    ],
  };
  if (excludeId) filter._id = { $ne: excludeId };
  const existing = await Skill.findOne(filter).select("name").lean();
  if (existing) {
    throw new AppError(
      409,
      "SKILL_IDENTITY_DUPLICATE",
      `A skill or alias already uses this identity: ${existing.name}`,
    );
  }
}

async function validateReferences({ currentId, parentSkillId, relatedSkills = [], prerequisites = [] }) {
  const current = currentId ? String(currentId) : null;
  const ids = [...new Set([parentSkillId, ...relatedSkills, ...prerequisites].filter(Boolean).map(String))];
  if (current && ids.includes(current)) {
    throw new AppError(400, "SKILL_SELF_REFERENCE", "A skill cannot reference itself");
  }
  if (!ids.length) return;
  const count = await Skill.countDocuments({ _id: { $in: ids }, status: "active" });
  if (count !== ids.length) {
    throw new AppError(400, "SKILL_REFERENCE_INVALID", "Every related skill must exist and be active");
  }
}

function normalizePrerequisiteRules(prerequisites = [], rules = []) {
  const prerequisiteIds = [...new Set(prerequisites.map(String))];
  const configured = new Map();
  rules.forEach((rule) => {
    const id = String(rule.skillId);
    if (configured.has(id)) {
      throw new AppError(
        400,
        "SKILL_PREREQUISITE_DUPLICATE",
        "Each prerequisite can have only one relationship configuration",
      );
    }
    configured.set(id, {
      skillId: id,
      importance: rule.importance || "essential",
      minimumProficiency: rule.minimumProficiency || "beginner",
      requiredForLevels: [...new Set(rule.requiredForLevels || [])],
    });
  });
  const unknownRule = [...configured.keys()].find((id) => !prerequisiteIds.includes(id));
  if (unknownRule) {
    throw new AppError(
      400,
      "SKILL_PREREQUISITE_RULE_INVALID",
      "Prerequisite settings must reference a configured prerequisite",
    );
  }
  return prerequisiteIds.map((skillId) => configured.get(skillId) || {
    skillId,
    importance: "essential",
    minimumProficiency: "beginner",
    requiredForLevels: [],
  });
}

async function assertNoPrerequisiteCycle(skillId, prerequisiteIds) {
  if (!prerequisiteIds.length) return;
  const allSkills = await Skill.find({ status: "active" }).select("_id prerequisites").lean();
  const graph = new Map(
    allSkills.map((skill) => [String(skill._id), (skill.prerequisites || []).map(String)]),
  );
  const target = String(skillId);
  for (const prerequisiteId of prerequisiteIds.map(String)) {
    const queue = [prerequisiteId];
    const visited = new Set();
    while (queue.length) {
      const current = queue.shift();
      if (current === target) {
        throw new AppError(
          400,
          "SKILL_PREREQUISITE_CYCLE",
          "This prerequisite would create a circular dependency",
        );
      }
      if (visited.has(current)) continue;
      visited.add(current);
      queue.push(...(graph.get(current) || []));
    }
  }
}

async function createSkill(values, adminUserId) {
  const name = cleanSkillLabel(values.name);
  await assertIdentityAvailable({ name, aliases: values.aliases });
  const prerequisiteRules = normalizePrerequisiteRules(
    values.prerequisites || [],
    values.prerequisiteRules || [],
  );
  const skill = new Skill({
    ...values,
    prerequisiteRules,
    _id: new mongoose.Types.ObjectId(),
    name,
    slug: skillSlug(name),
    createdBy: adminUserId,
  });
  await validateReferences({
    currentId: skill._id,
    parentSkillId: values.parentSkillId,
    relatedSkills: values.relatedSkills,
    prerequisites: values.prerequisites,
  });
  await assertNoPrerequisiteCycle(skill._id, values.prerequisites);
  try {
    await skill.save();
  } catch (error) {
    if (error?.code === 11000) {
      throw new AppError(409, "SKILL_DUPLICATE", "A skill with this name or slug already exists");
    }
    throw error;
  }
  if (skill.relatedSkills.length) {
    await Skill.updateMany(
      { _id: { $in: skill.relatedSkills } },
      { $addToSet: { relatedSkills: skill._id } },
    );
  }
  return presentSkill(skill);
}

async function updateSkill(skillId, values) {
  const skill = await Skill.findById(skillId);
  if (!skill) throw new AppError(404, "SKILL_NOT_FOUND", "Skill was not found");
  const nextName = values.name === undefined ? skill.name : cleanSkillLabel(values.name);
  const nextAliases = values.aliases === undefined ? skill.aliases : values.aliases;
  await assertIdentityAvailable({ name: nextName, aliases: nextAliases, excludeId: skill._id });

  const nextParent = values.parentSkillId === undefined ? skill.parentSkillId : values.parentSkillId;
  const nextRelated = values.relatedSkills === undefined ? skill.relatedSkills : values.relatedSkills;
  const nextPrerequisites = values.prerequisites === undefined ? skill.prerequisites : values.prerequisites;
  const nextRules = values.prerequisiteRules === undefined
    ? (skill.prerequisiteRules || []).filter((rule) =>
      nextPrerequisites.map(String).includes(String(rule.skillId)))
    : values.prerequisiteRules;
  const normalizedRules = normalizePrerequisiteRules(nextPrerequisites, nextRules);
  await validateReferences({
    currentId: skill._id,
    parentSkillId: nextParent,
    relatedSkills: nextRelated,
    prerequisites: nextPrerequisites,
  });
  await assertNoPrerequisiteCycle(skill._id, nextPrerequisites);

  const previousRelated = new Set(skill.relatedSkills.map(String));
  Object.assign(skill, values);
  skill.prerequisiteRules = normalizedRules;
  if (values.name !== undefined) skill.slug = skillSlug(nextName);
  await skill.save();

  if (values.relatedSkills !== undefined) {
    const nextSet = new Set(nextRelated.map(String));
    const added = [...nextSet].filter((id) => !previousRelated.has(id));
    const removed = [...previousRelated].filter((id) => !nextSet.has(id));
    if (added.length) {
      await Skill.updateMany({ _id: { $in: added } }, { $addToSet: { relatedSkills: skill._id } });
    }
    if (removed.length) {
      await Skill.updateMany({ _id: { $in: removed } }, { $pull: { relatedSkills: skill._id } });
    }
  }
  return presentSkill(skill);
}

async function setSkillStatus(skillId, status) {
  const skill = await Skill.findByIdAndUpdate(skillId, { $set: { status } }, { returnDocument: "after" });
  if (!skill) throw new AppError(404, "SKILL_NOT_FOUND", "Skill was not found");
  return presentSkill(skill);
}

async function manageRelationship(
  skillId,
  {
    relationshipType,
    targetSkillId,
    importance = "essential",
    minimumProficiency = "beginner",
    requiredForLevels = [],
  },
  remove = false,
) {
  const [skill, target] = await Promise.all([
    Skill.findOne({ _id: skillId, status: "active" }),
    Skill.findOne({ _id: targetSkillId, status: "active" }),
  ]);
  if (!skill || !target) {
    throw new AppError(404, "SKILL_REFERENCE_INVALID", "Both skills must exist and be active");
  }
  if (String(skill._id) === String(target._id)) {
    throw new AppError(400, "SKILL_SELF_REFERENCE", "A skill cannot reference itself");
  }

  const field = relationshipType === "related" ? "relatedSkills" : "prerequisites";
  if (!remove && relationshipType === "prerequisite") {
    await assertNoPrerequisiteCycle(skill._id, [...skill.prerequisites, target._id]);
  }
  if (relationshipType === "prerequisite") {
    if (remove) {
      await Skill.updateOne(
        { _id: skill._id },
        {
          $pull: {
            prerequisites: target._id,
            prerequisiteRules: { skillId: target._id },
          },
        },
      );
    } else {
      await Skill.updateOne(
        { _id: skill._id },
        {
          $addToSet: { prerequisites: target._id },
          $pull: { prerequisiteRules: { skillId: target._id } },
        },
      );
      await Skill.updateOne(
        { _id: skill._id },
        {
          $addToSet: {
            prerequisiteRules: {
              skillId: target._id,
              importance,
              minimumProficiency,
              requiredForLevels: [...new Set(requiredForLevels)],
            },
          },
        },
      );
    }
  } else {
    const operation = remove
      ? { $pull: { [field]: target._id } }
      : { $addToSet: { [field]: target._id } };
    await Skill.updateOne({ _id: skill._id }, operation);
  }
  if (relationshipType === "related") {
    const reverse = remove
      ? { $pull: { relatedSkills: skill._id } }
      : { $addToSet: { relatedSkills: skill._id } };
    await Skill.updateOne({ _id: target._id }, reverse);
  }
  return getSkillDependencies(skill._id, { activeOnly: false });
}

function rulesForSkill(skill) {
  const configured = new Map(
    (skill.prerequisiteRules || []).map((rule) => [String(rule.skillId), rule]),
  );
  return (skill.prerequisites || []).map((skillId) => {
    const rule = configured.get(String(skillId)) || {};
    return {
      skillId: String(skillId),
      importance: rule.importance || "essential",
      minimumProficiency: rule.minimumProficiency || "beginner",
      requiredForLevels: rule.requiredForLevels || [],
    };
  });
}

function dependencyNode(skill, children = []) {
  return {
    id: String(skill._id),
    name: skill.name,
    category: skill.category,
    difficultyLevel: skill.difficultyLevel,
    prerequisiteRules: rulesForSkill(skill),
    prerequisites: children,
  };
}

async function getSkillDependencies(skillId, { activeOnly = true } = {}) {
  const current = await findSkill(skillId, { activeOnly });
  const all = await Skill.find(activeOnly ? { status: "active" } : {}).select(
    "name category difficultyLevel status prerequisites prerequisiteRules relatedSkills",
  ).lean();
  const byId = new Map(all.map((skill) => [String(skill._id), skill]));
  const buildTree = (id, trail = new Set(), depth = 0) => {
    const skill = byId.get(String(id));
    if (!skill) return null;
    if (trail.has(String(id)) || depth >= 8) return dependencyNode(skill, []);
    const nextTrail = new Set(trail).add(String(id));
    const children = (skill.prerequisites || [])
      .map((prerequisite) => buildTree(prerequisite, nextTrail, depth + 1))
      .filter(Boolean);
    return dependencyNode(skill, children);
  };
  const prerequisites = (current.prerequisites || []).map((id) => byId.get(String(id))).filter(Boolean);
  const related = (current.relatedSkills || []).map((id) => byId.get(String(id))).filter(Boolean);
  const dependents = all.filter((skill) =>
    (skill.prerequisites || []).some((id) => String(id) === String(current._id)),
  );
  return {
    skill: presentSkill(current),
    prerequisites: prerequisites.map(presentSkill),
    prerequisiteRules: rulesForSkill(current),
    relatedSkills: related.map(presentSkill),
    dependents: dependents.map(presentSkill),
    tree: buildTree(current._id),
  };
}

async function getSkillDetails(skillId) {
  const dependencies = await getSkillDependencies(skillId);
  return dependencies;
}

module.exports = {
  assertIdentityAvailable,
  assertNoPrerequisiteCycle,
  createSkill,
  findSkill,
  getSkillDependencies,
  getSkillDetails,
  listSkills,
  manageRelationship,
  normalizePrerequisiteRules,
  presentSkill,
  setSkillStatus,
  updateSkill,
  validateReferences,
};
