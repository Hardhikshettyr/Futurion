import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import CareerCard from "../components/careers/CareerCard.jsx";
import AppShell from "../layouts/AppShell.jsx";
import { analyzeCareerWithAi, getCareer, recordCareerView, removeSavedCareer, saveCareer, setCareerComparison } from "../services/careerApi.js";

const TABS = [["overview", "Overview"], ["education", "Education & pathways"], ["skills", "Skills & preparation"], ["progression", "Progression"]];

function List({ values, empty = "No catalogue information is currently recorded." }) {
  return values?.length ? <ul className="career-detail-list">{values.map((value, index) => <li key={`${typeof value === "string" ? value : value.name}-${index}`}>{typeof value === "string" ? value : value.name}</li>)}</ul> : <p className="text-sm text-[#71827f]">{empty}</p>;
}

function CertificationList({ values }) {
  if (!values?.length) return <p className="text-sm text-[#71827f]">No catalogue information is currently recorded.</p>;
  return <div className="space-y-3">{values.map((item, index) => <article key={`${item.name}-${index}`} className="border-l-2 border-[#71a897] pl-3"><strong className="text-sm text-[#294f4a]">{item.name}</strong>{item.issuer && <small className="mt-1 block text-[#70817e]">Issued by {item.issuer}</small>}{item.description && <p className="mt-1 text-xs leading-5 text-[#657975]">{item.description}</p>}{item.linkVerified && item.externalUrl && <a href={item.externalUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs font-bold text-[#174b47] underline decoration-[#e9794a] underline-offset-4">Verified issuer link ↗</a>}</article>)}</div>;
}

function CareerDetailPage() {
  const { careerId } = useParams();
  const [data, setData] = useState(null);
  const [tab, setTab] = useState("overview");
  const [status, setStatus] = useState({ loading: true, error: "", saving: false });
  const [ai, setAi] = useState({ loading: false, error: "", result: null });

  useEffect(() => {
    let active = true;
    setStatus({ loading: true, error: "", saving: false });
    getCareer(careerId).then((response) => {
      if (!active) return;
      setData(response);
      recordCareerView(response.career.id).catch(() => {});
    }).catch((error) => active && setStatus((current) => ({ ...current, error: error.message }))).finally(() => active && setStatus((current) => ({ ...current, loading: false })));
    return () => { active = false; };
  }, [careerId]);

  async function toggleSaved() {
    if (!data || status.saving) return;
    setStatus((current) => ({ ...current, saving: true, error: "" }));
    try {
      const response = data.studentState.saved ? await removeSavedCareer(data.career.id) : await saveCareer(data.career.id);
      setData((current) => ({ ...current, studentState: { ...current.studentState, ...response.state } }));
    } catch (error) { setStatus((current) => ({ ...current, error: error.message })); }
    finally { setStatus((current) => ({ ...current, saving: false })); }
  }

  async function toggleCompare(value) {
    try {
      const response = await setCareerComparison(data.career.id, value);
      setData((current) => ({ ...current, studentState: { ...current.studentState, ...response.state } }));
    } catch (error) { setStatus((current) => ({ ...current, error: error.message })); }
  }

  async function runAiAnalysis() {
    setAi({ loading: true, error: "", result: null });
    try { const response = await analyzeCareerWithAi(data.career.id); setAi({ loading: false, error: "", result: response.result }); }
    catch (error) { setAi({ loading: false, error: error.message, result: null }); }
  }

  if (status.loading) return <AppShell eyebrow="Career discovery" title="Opening career"><div className="profile-loading">Loading structured career information…</div></AppShell>;
  if (status.error && !data) return <AppShell eyebrow="Career discovery" title="Career unavailable"><div role="alert" className="profile-alert profile-alert-error">{status.error}</div><Link to="/dashboard/careers" className="secondary-button mt-5">Back to careers</Link></AppShell>;
  const { career, studentFit: fit, studentState } = data;

  return (
    <AppShell eyebrow={career.categoryLabel} title={career.title}>
      <Link to="/dashboard/careers" className="text-sm font-bold text-[#55716d] hover:text-[#bf5838]">← Back to Career Explorer</Link>
      <section className="career-detail-hero">
        <div><p className="text-xs font-extrabold uppercase tracking-[.16em] text-[#e9794a]">{career.industry}</p><h2 className="mt-3 max-w-3xl font-serif text-4xl leading-tight text-white sm:text-5xl">{career.shortDescription}</h2><div className="mt-6 flex flex-wrap gap-2">{career.workModes.map((item) => <span key={item} className="border border-white/20 px-3 py-1.5 text-xs font-bold text-[#c8dcd7]">{item.replaceAll("_", " ")}</span>)}</div></div>
        <div className="career-detail-action"><span>{fit?.score ?? "—"}<small>profile fit</small></span><p>{fit?.confidence || "low"} confidence · {fit?.availableWeight || 0}% data weight</p><button className="primary-button mt-4 w-full !border-[#f19a69] !bg-[#f19a69] !text-[#173f3c]" onClick={toggleSaved} disabled={status.saving}>{studentState.saved ? "Saved ✓" : "Save career"}</button>{studentState.saved && <label className="mt-3 flex items-center justify-center gap-2 text-xs text-[#c8dcd7]"><input type="checkbox" checked={studentState.selectedForComparison} onChange={(event) => toggleCompare(event.target.checked)} /> Compare later</label>}</div>
      </section>
      {status.error && <div role="alert" className="profile-alert profile-alert-error mt-6">{status.error}</div>}

      <nav className="career-tabs" aria-label="Career information sections">{TABS.map(([key, label]) => <button key={key} onClick={() => setTab(key)} className={tab === key ? "career-tab-active" : ""}>{label}</button>)}</nav>

      {tab === "overview" && <div className="career-detail-grid"><section className="career-content-panel"><p className="eyebrow">What the work involves</p><p className="mt-4 text-sm leading-7 text-[#526b66]">{career.overview}</p><h3 className="career-section-title">Typical responsibilities</h3><List values={career.responsibilities} /></section><aside className="career-content-panel"><p className="eyebrow">Working context</p><h3 className="career-section-title !mt-4">Environments</h3><List values={career.workEnvironments} /><h3 className="career-section-title">Common entry roles</h3><List values={career.entryLevelRoles} /><h3 className="career-section-title">Tools and technologies</h3><div className="flex flex-wrap gap-2">{career.toolsAndTechnologies.map((item) => <span key={item} className="career-chip">{item}</span>)}</div></aside></div>}

      {tab === "education" && <div className="career-detail-grid"><section className="career-content-panel"><p className="eyebrow">Multiple pathways</p><h3 className="career-section-title !mt-4">Education routes</h3><div className="space-y-4">{career.requiredEducation.map((item, index) => <article key={`${item.qualification}-${index}`} className="career-pathway"><span>{item.pathwayType}</span><h4>{item.qualification}</h4><p>{item.description}</p>{item.disciplines.length > 0 && <small>Relevant disciplines: {item.disciplines.join(", ")}</small>}</article>)}</div><p className="mt-5 text-xs leading-5 text-[#71827f]">Pathways vary by employer, institution, jurisdiction, and role. Investigate current local requirements.</p></section><aside className="career-content-panel"><p className="eyebrow">Discipline alignment</p><div className="mt-4 space-y-3">{career.acceptedDisciplines.map((item) => <div key={item.name} className="border-l-2 border-[#71a897] pl-3"><strong className="text-sm">{item.name}</strong><small className="block mt-1 uppercase tracking-wider text-[#71827f]">{item.alignment}</small><p className="mt-1 text-xs leading-5 text-[#657975]">{item.notes}</p></div>)}</div>{fit.crossDisciplinePathways.length > 0 && <><h3 className="career-section-title">Your cross-discipline route</h3>{fit.crossDisciplinePathways.map((item, index) => <div key={index} className="career-cross-path"><p>{item.whyRelevant}</p><strong>Transferable strengths</strong><List values={item.transferableStrengths} /><strong>Investigate next</strong><List values={item.investigationSteps} /></div>)}</>}</aside></div>}

      {tab === "skills" && <div className="career-detail-grid"><section className="career-content-panel"><p className="eyebrow">Library requirements</p><h3 className="career-section-title !mt-4">Essential skills</h3><div className="space-y-3">{career.essentialSkills.map((item) => <div key={item.skill.id} className="career-skill-row"><span><strong>{item.skill.name}</strong><small>{item.rationale}</small></span><b>{item.requiredProficiency}</b></div>)}</div><h3 className="career-section-title">Desirable skills</h3><div className="space-y-3">{career.desirableSkills.map((item) => <div key={item.skill.id} className="career-skill-row"><span><strong>{item.skill.name}</strong><small>{item.rationale}</small></span><b>{item.requiredProficiency}</b></div>)}</div><h3 className="career-section-title">Related library skills</h3><div className="flex flex-wrap gap-2">{[...new Map([...career.essentialSkills, ...career.desirableSkills].flatMap((item) => item.skill.relatedSkills || []).map((skill) => [skill.id, skill])).values()].map((skill) => <span key={skill.id} className="career-chip">{skill.name}</span>)}</div></section><aside className="career-content-panel"><p className="eyebrow">Your preparation map</p><h3 className="career-section-title !mt-4">Matching</h3><List values={fit.matchingSkills.map((item) => item.skill.name)} /><h3 className="career-section-title">Missing</h3><List values={fit.missingSkills.map((item) => `${item.skill.name} — target ${item.requiredProficiency}`)} /><h3 className="career-section-title">Strengthen</h3><List values={fit.skillsRequiringImprovement.map((item) => `${item.skill.name}: ${item.currentProficiency} → ${item.requiredProficiency}`)} /><p className="mt-5 text-xs leading-5 text-[#71827f]">{fit.disclaimer}</p></aside></div>}

      {tab === "progression" && <div className="career-detail-grid"><section className="career-content-panel"><p className="eyebrow">Possible progression</p><div className="mt-5 space-y-4">{career.careerProgression.map((item, index) => <article key={`${item.level}-${index}`} className="career-progression"><span>{String(index + 1).padStart(2, "0")}</span><div><small>{item.level}</small><h3>{item.roles.join(" · ")}</h3><p>{item.description}</p></div></article>)}</div><p className="mt-5 text-xs leading-5 text-[#71827f]">Progression is illustrative, not guaranteed. Actual titles and movement vary by organization and experience.</p></section><aside className="career-content-panel"><p className="eyebrow">Certifications</p><h3 className="career-section-title !mt-4">Required where applicable</h3><CertificationList values={career.requiredCertifications} /><h3 className="career-section-title">Commonly useful</h3><CertificationList values={career.recommendedCertifications} /><p className="mt-5 text-xs leading-5 text-[#71827f]">External links appear only when verified by the library. Confirm current issuer and role requirements independently.</p></aside></div>}

      <section className="career-ai-detail"><div><p className="eyebrow">Career insights</p><h2 className="mt-2 font-serif text-3xl">Review how this path connects to your records</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-[#607570]">The review uses this Career Library record and your profile. It cannot change your information or establish eligibility.</p></div><button onClick={runAiAnalysis} className="primary-button" disabled={ai.loading}>{ai.loading ? "Reviewing…" : "Generate career insights"}</button>{ai.error && <div role="alert" className="profile-alert profile-alert-error md:col-span-2">Unable to complete this request. Please try again.</div>}{ai.result && <div className="career-ai-answer md:col-span-2"><p>{ai.result.summary}</p><h3>Suggested next steps</h3><List values={ai.result.nextSteps} />{ai.result.uncertainties.length > 0 && <small>Information to investigate: {ai.result.uncertainties.join(" ")}</small>}</div>}</section>

      {career.relatedCareers.length > 0 && <section className="career-shelf"><p className="eyebrow">Keep exploring</p><h2 className="mt-2 font-serif text-3xl">Related careers</h2><div className="career-grid mt-5">{career.relatedCareers.map((item) => <CareerCard key={item.id} career={{ ...item, categoryLabel: item.careerCategory?.replaceAll("_", " "), essentialSkills: [] }} compact />)}</div></section>}
    </AppShell>
  );
}

export default CareerDetailPage;
