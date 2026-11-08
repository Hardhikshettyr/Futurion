const { getCareerCategories, getCareerDetails, listCareers } = require("../services/careerLibraryService");
const { getCareerFit } = require("../services/careerRecommendationService");
const { getCareerState } = require("../services/studentCareerService");
const { careerQuerySchema } = require("../validators/careerSchemas");
const { validateRequest } = require("../utils/validation");

function validationFailure(response, errors) {
  return response.status(400).json({ success: false, code: "VALIDATION_ERROR", message: "Validation failed", errors });
}

async function list(request, response, next) {
  const validation = validateRequest(careerQuerySchema, request.query);
  if (validation.errors) return validationFailure(response, validation.errors);
  try {
    return response.status(200).json({ success: true, ...(await listCareers(validation.data)) });
  } catch (error) { return next(error); }
}

async function categories(_request, response, next) {
  try {
    return response.status(200).json({ success: true, ...(await getCareerCategories()) });
  } catch (error) { return next(error); }
}

async function detail(request, response, next) {
  try {
    const career = await getCareerDetails(request.params.careerId);
    const studentData = request.auth.user.role === "student"
      ? await Promise.all([getCareerFit(request.auth.userId, career.id), getCareerState(request.auth.userId, career.id)])
      : [];
    return response.status(200).json({
      success: true,
      career,
      ...(studentData.length ? { studentFit: studentData[0], studentState: studentData[1] } : {}),
    });
  } catch (error) { return next(error); }
}

async function related(request, response, next) {
  try {
    const career = await getCareerDetails(request.params.careerId);
    return response.status(200).json({ success: true, career: { id: career.id, title: career.title }, items: career.relatedCareers });
  } catch (error) { return next(error); }
}

module.exports = { categories, detail, list, related };
