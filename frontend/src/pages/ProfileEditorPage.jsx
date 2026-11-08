import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import PersonalProfileForm from "../components/profile/PersonalProfileForm.jsx";
import PreferencesForm from "../components/profile/PreferencesForm.jsx";
import RepeatableSectionForm from "../components/profile/RepeatableSectionForm.jsx";
import ResumeManager from "../components/profile/ResumeManager.jsx";
import { useStudentProfile } from "../context/StudentProfileContext.jsx";
import AppShell from "../layouts/AppShell.jsx";

const SECTIONS = [
  ["personal", "Personal information"],
  ["education", "Education"],
  ["skills", "Skills"],
  ["projects", "Projects"],
  ["experience", "Experience"],
  ["certifications", "Certifications"],
  ["preferences", "Career preferences"],
  ["resume", "Resume management"],
];

function ProfileEditorPage() {
  const { error, isLoading, profile, refreshProfile } = useStudentProfile();
  const [params, setParams] = useSearchParams();
  const requested = params.get("section");
  const active = SECTIONS.some(([key]) => key === requested) ? requested : "personal";
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    const warn = (event) => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const setDirtyStable = useCallback((value) => setDirty(value), []);

  function changeSection(section) {
    if (dirty && !window.confirm("Discard unsaved changes in this section?")) return;
    setDirty(false);
    setParams({ section });
  }

  if (isLoading && !profile) {
    return <AppShell eyebrow="Unified student profile" title="Loading profile…"><div className="profile-loading">Preparing your profile workspace…</div></AppShell>;
  }
  if (error && !profile) {
    return <AppShell eyebrow="Unified student profile" title="Profile unavailable"><div className="profile-alert profile-alert-error">{error}<button type="button" onClick={refreshProfile} className="ml-2 font-bold underline">Try again</button></div></AppShell>;
  }
  if (!profile) return null;

  const sectionMeta = profile.completeness.sections[active];

  return (
    <AppShell eyebrow="Unified student profile" title="Edit your story">
      <div className="profile-workspace-intro mb-7 flex flex-wrap items-center justify-between gap-4">
        <p className="max-w-2xl text-sm leading-6 text-[#667a76]">Build one reliable source of truth for future Futurion career tools. Save each section independently.</p>
        <Link to="/profile" className="secondary-button">View profile overview</Link>
      </div>
      <div className="profile-editor-grid grid gap-7 xl:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="profile-section-nav self-start border border-[#d4ddd6] bg-white p-3 shadow-[0_12px_30px_rgba(20,62,58,.05)] xl:sticky xl:top-6">
          <div className="mb-3 border-b border-[#e1e7e2] p-3">
            <p className="text-xs font-bold uppercase tracking-wider text-[#748782]">Overall completeness</p>
            <div className="mt-2 flex items-end gap-2"><strong className="font-serif text-4xl text-[#174b47]">{profile.completeness.overall}%</strong><span className="mb-1 text-xs text-[#7d8c89]">profile only</span></div>
          </div>
          <nav className="space-y-1" aria-label="Profile editor sections">
            {SECTIONS.map(([key, label]) => (
              <button key={key} type="button" onClick={() => changeSection(key)} className={`flex w-full items-center justify-between border-l-2 px-3 py-3 text-left text-sm font-bold transition ${active === key ? "border-[#e9794a] bg-[#f6f5ef] text-[#174b47]" : "border-transparent text-[#60736f] hover:bg-[#f7f8f4]"}`}>
                <span>{label}</span><span className="text-[10px] text-[#8a9a96]">{profile.completeness.sections[key].percentage}%</span>
              </button>
            ))}
          </nav>
        </aside>

        <section className="profile-editor-canvas min-w-0 border border-[#d4ddd6] bg-white p-5 shadow-[0_18px_42px_rgba(18,60,58,.06)] sm:p-8">
          <div className="profile-section-heading mb-7 border-b border-[#e1e7e2] pb-5">
            <p className="eyebrow">{sectionMeta.percentage}% complete</p>
            <h2 className="mt-2 font-serif text-3xl text-[#214743]">{SECTIONS.find(([key]) => key === active)[1]}</h2>
            {sectionMeta.suggestions[0] && <p className="mt-3 text-sm leading-6 text-[#6a7d79]">{sectionMeta.suggestions[0]}</p>}
          </div>
          {active === "personal" && <PersonalProfileForm onDirtyChange={setDirtyStable} />}
          {active === "skills" && <div className="border border-[#d4ddd6] bg-[#f8f6ef] p-7"><p className="eyebrow">Canonical skill identities</p><h3 className="mt-3 font-serif text-3xl text-[#214743]">Skills now live in Skill Intelligence.</h3><p className="mt-3 max-w-2xl text-sm leading-7 text-[#667a76]">Use the central library to avoid duplicate names, track learning and proficiency, connect owned evidence, and understand prerequisites. Existing unmatched profile skills remain preserved.</p><Link to="/dashboard/skills?view=my-skills" className="primary-button mt-6">Open Skill Intelligence</Link></div>}
          {["education", "projects", "experience", "certifications"].includes(active) && <RepeatableSectionForm key={active} section={active} onDirtyChange={setDirtyStable} />}
          {active === "preferences" && <PreferencesForm onDirtyChange={setDirtyStable} />}
          {active === "resume" && <ResumeManager />}
        </section>
      </div>
    </AppShell>
  );
}

export default ProfileEditorPage;
