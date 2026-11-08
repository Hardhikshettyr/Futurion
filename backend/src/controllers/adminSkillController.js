const {
  createSkill,
  manageRelationship,
  setSkillStatus,
  updateSkill,
} = require("../services/skillLibraryService");
const {
  adminSkillCreateSchema,
  adminSkillUpdateSchema,
  objectId,
  skillRelationshipSchema,
  skillStatusSchema,
} = require("../validators/skillSchemas");
const { validateRequest } = require("../utils/validation");

function validate(schema, value, response) {
  const result = validateRequest(schema, value);
  if (!result.errors) return result.data;
  response.status(400).json({ success: false, code: "VALIDATION_ERROR", message: "Validation failed", errors: result.errors });
  return null;
}

async function create(request, response, next) {
  const values = validate(adminSkillCreateSchema, request.body, response);
  if (!values) return response;
  try {
    return response.status(201).json({ success: true, message: "Skill created", skill: await createSkill(values, request.auth.userId) });
  } catch (error) {
    return next(error);
  }
}

async function update(request, response, next) {
  const skillId = validate(objectId, request.params.skillId, response);
  const values = validate(adminSkillUpdateSchema, request.body, response);
  if (!skillId || !values) return response;
  try {
    return response.status(200).json({ success: true, message: "Skill updated", skill: await updateSkill(skillId, values) });
  } catch (error) {
    return next(error);
  }
}

async function updateStatus(request, response, next) {
  const skillId = validate(objectId, request.params.skillId, response);
  const values = validate(skillStatusSchema, request.body, response);
  if (!skillId || !values) return response;
  try {
    return response.status(200).json({ success: true, message: `Skill ${values.status}`, skill: await setSkillStatus(skillId, values.status) });
  } catch (error) {
    return next(error);
  }
}

function relationship(remove) {
  return async function changeRelationship(request, response, next) {
    const skillId = validate(objectId, request.params.skillId, response);
    const values = validate(skillRelationshipSchema, request.body, response);
    if (!skillId || !values) return response;
    try {
      const result = await manageRelationship(skillId, values, remove);
      return response.status(200).json({ success: true, message: remove ? "Relationship removed" : "Relationship added", ...result });
    } catch (error) {
      return next(error);
    }
  };
}

module.exports = {
  create,
  removeRelationship: relationship(true),
  update,
  updateStatus,
  addRelationship: relationship(false),
};
