const { createCareer, getCareerDetails, listCareers, manageRelatedCareer, setCareerStatus, updateCareer } = require("../services/careerLibraryService");
const { careerCreateSchema, careerQuerySchema, careerStatusSchema, careerUpdateSchema, objectId, relatedCareerSchema } = require("../validators/careerSchemas");
const { validateRequest } = require("../utils/validation");

function validate(schema, value, response) {
  const result = validateRequest(schema, value);
  if (!result.errors) return result.data;
  response.status(400).json({ success: false, code: "VALIDATION_ERROR", message: "Validation failed", errors: result.errors });
  return null;
}

async function create(request, response, next) {
  const values = validate(careerCreateSchema, request.body, response);
  if (!values) return response;
  try { return response.status(201).json({ success: true, message: "Career created", career: await createCareer(values, request.auth.userId) }); }
  catch (error) { return next(error); }
}

async function list(request, response, next) {
  const query = validate(careerQuerySchema, request.query, response);
  if (!query) return response;
  try { return response.status(200).json({ success: true, ...(await listCareers(query, { includeInactive: true })) }); }
  catch (error) { return next(error); }
}

async function detail(request, response, next) {
  const careerId = validate(objectId, request.params.careerId, response);
  if (!careerId) return response;
  try { return response.status(200).json({ success: true, career: await getCareerDetails(careerId, { activeOnly: false }) }); }
  catch (error) { return next(error); }
}

async function update(request, response, next) {
  const careerId = validate(objectId, request.params.careerId, response);
  const values = validate(careerUpdateSchema, request.body, response);
  if (!careerId || !values) return response;
  try { return response.status(200).json({ success: true, message: "Career updated", career: await updateCareer(careerId, values) }); }
  catch (error) { return next(error); }
}

async function updateStatus(request, response, next) {
  const careerId = validate(objectId, request.params.careerId, response);
  const values = validate(careerStatusSchema, request.body, response);
  if (!careerId || !values) return response;
  try { return response.status(200).json({ success: true, message: `Career ${values.status}`, career: await setCareerStatus(careerId, values.status) }); }
  catch (error) { return next(error); }
}

function relationship(remove) {
  return async function change(request, response, next) {
    const careerId = validate(objectId, request.params.careerId, response);
    const values = validate(relatedCareerSchema, request.body, response);
    if (!careerId || !values) return response;
    try { return response.status(200).json({ success: true, message: remove ? "Related career removed" : "Related career added", career: await manageRelatedCareer(careerId, values.targetCareerId, remove) }); }
    catch (error) { return next(error); }
  };
}

module.exports = { addRelationship: relationship(false), create, detail, list, removeRelationship: relationship(true), update, updateStatus };
