const { generatePortfolioPdf } = require("../services/portfolioPdfService");
const { getPublicPortfolio, getStudentPortfolio, publishPortfolio, updatePortfolioContent, updatePublicSettings } = require("../services/portfolioService");
const { portfolioContentSchema, portfolioPublishSchema, portfolioPublicSettingsSchema, publicSlugSchema } = require("../validators/progressPortfolioSchemas");
const { validateRequest } = require("../utils/validation");

function validated(schema, value, response) {
  const result = validateRequest(schema, value);
  if (!result.errors) return result.data;
  response.status(400).json({ success: false, code: "VALIDATION_ERROR", message: "Validation failed", errors: result.errors });
  return null;
}

async function getOwned(request, response, next) {
  try { return response.status(200).json({ success: true, ...(await getStudentPortfolio(request.auth.userId)) }); }
  catch (error) { return next(error); }
}
async function updateContent(request, response, next) {
  const values = validated(portfolioContentSchema, request.body, response); if (!values) return response;
  try { return response.status(200).json({ success: true, message: "Portfolio visibility saved", ...(await updatePortfolioContent(request.auth.userId, values)) }); }
  catch (error) { return next(error); }
}
async function publish(request, response, next) {
  const values = validated(portfolioPublishSchema, request.body, response); if (!values) return response;
  try { return response.status(200).json({ success: true, message: "Public portfolio enabled", ...(await publishPortfolio(request.auth.userId, values)) }); }
  catch (error) { return next(error); }
}
async function publicSettings(request, response, next) {
  const values = validated(portfolioPublicSettingsSchema, request.body, response); if (!values) return response;
  try { return response.status(200).json({ success: true, message: values.isPublic === false ? "Public portfolio disabled" : "Public portfolio settings saved", ...(await updatePublicSettings(request.auth.userId, values)) }); }
  catch (error) { return next(error); }
}
async function publicPortfolio(request, response, next) {
  const publicSlug = validated(publicSlugSchema, request.params.publicSlug, response); if (!publicSlug) return response;
  try { return response.status(200).json({ success: true, portfolio: await getPublicPortfolio(publicSlug) }); }
  catch (error) { return next(error); }
}
async function downloadPdf(request, response, next) {
  try {
    const { portfolio } = await getStudentPortfolio(request.auth.userId);
    const pdf = await generatePortfolioPdf(portfolio);
    const filename = `${portfolio.publicSlug || "career-portfolio"}.pdf`.replace(/[^a-z0-9.-]/gi, "-");
    response.set({ "Cache-Control": "no-store", "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${filename}"`, "Content-Length": String(pdf.length) });
    return response.status(200).send(pdf);
  } catch (error) { return next(error); }
}

module.exports = { downloadPdf, getOwned, publicPortfolio, publicSettings, publish, updateContent };
