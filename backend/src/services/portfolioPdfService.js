const PDFDocument = require("pdfkit");
const { PORTFOLIO_SECTION_LABELS } = require("../utils/portfolioTaxonomy");

function text(value) { return String(value || "").trim(); }
function lineList(document, values) {
  (values || []).filter(Boolean).forEach((value) => document.font("Helvetica").fontSize(9.5).fillColor("#365753").text(`• ${value}`, { indent: 8, paragraphGap: 3 }));
}
function heading(document, title) {
  if (document.y > 690) document.addPage();
  document.moveDown(0.7).font("Helvetica-Bold").fontSize(15).fillColor("#173f3c").text(title).moveDown(0.3);
  document.moveTo(54, document.y).lineTo(558, document.y).lineWidth(0.7).strokeColor("#d6dfda").stroke().moveDown(0.5);
}
function entry(document, title, meta, description, bullets = []) {
  if (document.y > 700) document.addPage();
  document.font("Helvetica-Bold").fontSize(11).fillColor("#244c47").text(title);
  if (meta) document.font("Helvetica").fontSize(8.5).fillColor("#748680").text(meta);
  if (description) document.moveDown(0.2).font("Helvetica").fontSize(9.5).fillColor("#455f5b").text(description, { lineGap: 2 });
  lineList(document, bullets);
  document.moveDown(0.5);
}

function renderPortfolioPdf(document, portfolio) {
  document.rect(0, 0, document.page.width, 112).fill("#173f3c");
  document.font("Helvetica-Bold").fontSize(27).fillColor("#ffffff").text(portfolio.name, 54, 39);
  const about = portfolio.sections.about;
  document.font("Helvetica").fontSize(10).fillColor("#d3e1dd").text([about?.headline, about?.location].filter(Boolean).join(" · "), 54, 78);
  document.y = 132;
  if (about) {
    heading(document, PORTFOLIO_SECTION_LABELS.about);
    if (about.summary) document.font("Helvetica").fontSize(10).fillColor("#455f5b").text(about.summary, { lineGap: 3 });
  }
  if (portfolio.sections.education) {
    heading(document, PORTFOLIO_SECTION_LABELS.education);
    portfolio.sections.education.forEach((item) => entry(document, item.degree || item.educationLevel || "Education", [item.institution, item.academicDiscipline, [item.startYear, item.graduationYear].filter(Boolean).join("–")].filter(Boolean).join(" · "), item.specialization, [...item.relevantCoursework.map((value) => `Coursework: ${value}`), ...item.academicAchievements]));
  }
  if (portfolio.sections.skills) {
    heading(document, PORTFOLIO_SECTION_LABELS.skills);
    portfolio.sections.skills.forEach((item) => entry(document, item.name, `${item.proficiency} · ${item.evidenceStatus.replaceAll("_", " ")}`, item.supportingEvidenceCount ? `${item.supportingEvidenceCount} supporting evidence record(s)` : ""));
  }
  if (portfolio.sections.projects) {
    heading(document, PORTFOLIO_SECTION_LABELS.projects);
    portfolio.sections.projects.forEach((item) => entry(document, item.title, [item.role, item.category, item.technologies.join(", ")].filter(Boolean).join(" · "), item.description, [...item.contributions, ...item.outcomes]));
  }
  if (portfolio.sections.certifications) {
    heading(document, PORTFOLIO_SECTION_LABELS.certifications);
    portfolio.sections.certifications.forEach((item) => entry(document, item.name, [item.issuer, item.issueDate].filter(Boolean).join(" · "), "", item.relatedSkills));
  }
  if (portfolio.sections.experience) {
    heading(document, PORTFOLIO_SECTION_LABELS.experience);
    portfolio.sections.experience.forEach((item) => entry(document, item.position, [item.organization, item.experienceType.replaceAll("_", " "), item.startDate && `${item.startDate}–${item.currentlyWorking ? "Present" : item.endDate}`].filter(Boolean).join(" · "), item.description, [...item.responsibilities, ...item.achievements]));
  }
  if (portfolio.sections.careerInterests) {
    heading(document, PORTFOLIO_SECTION_LABELS.career_interests);
    const interests = portfolio.sections.careerInterests;
    lineList(document, [...interests.careerInterests, ...interests.preferredRoles, ...interests.preferredIndustries]);
    if (interests.shortTermObjective) entry(document, "Short-term objective", "", interests.shortTermObjective);
    if (interests.longTermObjective) entry(document, "Long-term objective", "", interests.longTermObjective);
  }
  if (portfolio.sections.achievements) {
    heading(document, PORTFOLIO_SECTION_LABELS.achievements);
    portfolio.sections.achievements.forEach((item) => entry(document, item.title, item.date ? new Date(item.date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" }) : "", item.description));
  }
  const range = document.bufferedPageRange();
  for (let page = range.start; page < range.start + range.count; page += 1) {
    document.switchToPage(page);
    document.font("Helvetica").fontSize(7.5).fillColor("#82918e").text(`Futurion portfolio · ${portfolio.name} · Page ${page + 1}`, 54, 760, { width: 504, align: "center", lineBreak: false });
  }
}

function generatePortfolioPdf(portfolio) {
  return new Promise((resolve, reject) => {
    const document = new PDFDocument({ size: "A4", margins: { top: 46, right: 54, bottom: 52, left: 54 }, bufferPages: true, info: { Title: `${portfolio.name} — Career Portfolio`, Author: portfolio.name, Creator: "Futurion" } });
    const chunks = [];
    document.on("data", (chunk) => chunks.push(chunk));
    document.on("end", () => resolve(Buffer.concat(chunks)));
    document.on("error", reject);
    renderPortfolioPdf(document, portfolio);
    document.end();
  });
}

module.exports = { generatePortfolioPdf, renderPortfolioPdf };
