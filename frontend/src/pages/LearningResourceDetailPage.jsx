import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import AppShell from "../layouts/AppShell.jsx";
import { getLearningResource, saveLearningResource } from "../services/learningApi.js";

function SkillList({ title, values, empty }) {
  return <section><h3>{title}</h3>{values.length ? <div className="learning-detail-skills">{values.map((skill) => <span key={skill.id}>{skill.name}<small>{skill.category?.replaceAll("_", " ")}</small></span>)}</div> : <p className="learning-inline-empty">{empty}</p>}</section>;
}

function LearningResourceDetailPage() {
  const { resourceId } = useParams();
  const [resource, setResource] = useState(null);
  const [status, setStatus] = useState({ loading: true, saving: false, error: "", message: "" });

  useEffect(() => {
    let current = true;
    getLearningResource(resourceId).then((response) => current && setResource(response.resource))
      .catch((error) => current && setStatus((value) => ({ ...value, error: error.message })))
      .finally(() => current && setStatus((value) => ({ ...value, loading: false })));
    return () => { current = false; };
  }, [resourceId]);

  async function save(action) {
    setStatus((value) => ({ ...value, saving: true, error: "", message: "" }));
    try {
      const response = await saveLearningResource(resource.id, action);
      setResource((value) => ({ ...value, studentState: {
        id: response.item.id, bookmarked: response.item.bookmarked,
        inLearningLibrary: response.item.inLearningLibrary, status: response.item.status,
      } }));
      setStatus((value) => ({ ...value, message: response.message }));
    } catch (error) { setStatus((value) => ({ ...value, error: error.message })); }
    finally { setStatus((value) => ({ ...value, saving: false })); }
  }

  if (status.loading) return <AppShell eyebrow="Learning resource" title="Opening resource"><div className="profile-loading">Loading verified resource details…</div></AppShell>;
  if (!resource) return <AppShell eyebrow="Learning resource" title="Resource unavailable"><div role="alert" className="profile-alert profile-alert-error">{status.error || "Learning resource was not found"}</div><Link className="secondary-button mt-5" to="/dashboard/learning">Back to learning</Link></AppShell>;
  const price = resource.priceType === "free" ? "Free" : resource.priceAmount !== null ? `${resource.currency} ${resource.priceAmount}` : resource.priceType === "paid" ? "Paid · current price not recorded" : "Price not recorded";

  return <AppShell eyebrow={resource.category?.name || "Learning resource"} title={resource.title}>
    <Link to="/dashboard/learning" className="text-sm font-bold text-[#55716d] hover:text-[#bf5838]">← Back to Learning Resource Library</Link>
    {status.error && <div role="alert" className="profile-alert profile-alert-error mt-5">{status.error}</div>}{status.message && <div role="status" className="profile-alert profile-alert-success mt-5">{status.message}</div>}
    <section className="learning-detail-hero"><div><p>{resource.resourceType.replaceAll("_", " ")} · {resource.difficulty}</p><h2>{resource.provider}</h2><span>{resource.description}</span></div><aside><strong>{price}</strong><small>{resource.duration || "Duration not specified"}</small><div><button type="button" onClick={() => save("bookmark")} disabled={status.saving}>{resource.studentState?.bookmarked ? "Bookmarked ✓" : "Bookmark resource"}</button><button type="button" onClick={() => save("add_to_library")} disabled={status.saving}>{resource.studentState?.inLearningLibrary ? "In My Learning ✓" : "Add to My Learning"}</button></div></aside></section>
    <div className="learning-detail-layout"><main><SkillList title="Skills covered" values={resource.skillsCovered} empty="No central Skill reference is recorded." /><SkillList title="Prerequisites" values={resource.prerequisites} empty="No Skill Library prerequisite is recorded. Check the provider page for any additional requirements." /><section><h3>About this resource</h3><p>{resource.description}</p></section></main><aside><dl><div><dt>Provider</dt><dd>{resource.provider}</dd></div><div><dt>Format</dt><dd>{resource.resourceType.replaceAll("_", " ")}</dd></div><div><dt>Difficulty</dt><dd>{resource.difficulty}</dd></div><div><dt>Duration</dt><dd>{resource.duration || "Not recorded"}</dd></div><div><dt>Pricing</dt><dd>{price}</dd></div><div><dt>Certificate</dt><dd>{resource.certificateAvailable ? "Available according to the library record" : "Not listed"}</dd></div></dl><a href={resource.externalUrl} target="_blank" rel="noreferrer" className="primary-button learning-external-link">Open verified provider page ↗</a><p>Provider details can change. Confirm current pricing, duration, availability, and certificate conditions on the external page.</p></aside></div>
  </AppShell>;
}

export default LearningResourceDetailPage;
