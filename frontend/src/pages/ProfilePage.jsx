import { Link } from "react-router-dom";
import { useStudentProfile } from "../context/StudentProfileContext.jsx";
import ModuleIntroduction from "../components/ui/ModuleIntroduction.jsx";
import usePrivateImage from "../hooks/usePrivateImage.js";
import AppShell from "../layouts/AppShell.jsx";

function EmptySummary({ label, section }) {
  return (
    <div className="mt-4 border-l-2 border-[#d6dfd8] pl-4">
      <p className="text-sm text-[#7b8b87]">No {label.toLowerCase()} added yet.</p>
      <Link to={`/profile/edit?section=${section}`} className="mt-2 inline-block text-xs font-bold text-[#174b47] underline decoration-[#e9794a] underline-offset-4">Add {label.toLowerCase()}</Link>
    </div>
  );
}

function ProfilePage() {
  const { error, isLoading, profile, refreshProfile } = useStudentProfile();
  const photoUrl = usePrivateImage(Boolean(profile?.personal.photo), profile?.personal.photo?.uploadedAt);

  if (isLoading && !profile) {
    return <AppShell eyebrow="Unified student profile" title="Your profile"><div className="profile-loading">Assembling your profile…</div></AppShell>;
  }
  if (error && !profile) {
    return <AppShell eyebrow="Unified student profile" title="Your profile"><div className="profile-alert profile-alert-error">{error}<button type="button" onClick={refreshProfile} className="ml-2 font-bold underline">Try again</button></div></AppShell>;
  }
  if (!profile) return null;

  const primaryEducation = profile.education[0];
  const completion = profile.completeness;

  return (
    <AppShell eyebrow="Unified student profile" title="Your profile">
      <ModuleIntroduction eyebrow="Start with your foundation" title="Build your student profile" description="Bring your academic background, projects, experience, certifications and career preferences together in one structured record." value="A complete, accurate profile helps Futurion provide more relevant career recommendations and explain opportunity requirements using information you control." capabilities={["Add personal and academic information", "Document projects, experience and certifications", "Record career preferences and manage your resume"]} action={{ to: "/profile/edit", label: "Review profile sections" }} />
      <div className="grid gap-7 xl:grid-cols-[minmax(0,1fr)_330px]">
        <div className="space-y-7">
          <section className="profile-identity-card">
            <div className="relative z-10 flex flex-col gap-6 sm:flex-row sm:items-center">
              <div className="profile-photo-frame profile-photo-frame-large">
                {photoUrl ? <img src={photoUrl} alt={`${profile.personal.name}'s profile`} /> : <span aria-hidden="true">{profile.personal.name.slice(0, 1).toUpperCase()}</span>}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#f2a078]">Student profile</p>
                <h2 className="mt-2 font-serif text-4xl text-white sm:text-5xl">{profile.personal.name}</h2>
                <p className="mt-3 text-base text-[#c6dbd5]">{profile.personal.headline || "Add a professional headline that describes where you are growing."}</p>
                <p className="mt-2 text-sm text-[#9fbdb6]">{[profile.personal.city, profile.personal.state, profile.personal.country].filter(Boolean).join(", ") || "Location not added"}</p>
              </div>
              <Link to="/profile/edit?section=personal" className="ai-outline-button self-start">Edit personal details</Link>
            </div>
            <div className="profile-depth-grid" aria-hidden="true" />
          </section>

          <section className="profile-overview-grid">
            <article className="profile-summary-card md:col-span-2">
              <div className="flex items-center justify-between gap-3"><p className="eyebrow">Professional summary</p><Link to="/profile/edit?section=personal" className="profile-edit-link">Edit</Link></div>
              <p className="mt-4 text-sm leading-7 text-[#566e69]">{profile.personal.summary || "Tell your story in a few focused sentences—what you know, what you have done, and what you hope to explore next."}</p>
            </article>
            <article className="profile-summary-card">
              <div className="flex items-center justify-between gap-3"><h3 className="font-serif text-2xl text-[#214743]">Education</h3><Link to="/profile/edit?section=education" className="profile-edit-link">Edit</Link></div>
              {primaryEducation ? <div className="mt-4"><p className="font-bold text-[#294d49]">{primaryEducation.institution}</p><p className="mt-1 text-sm text-[#6c7d79]">{[primaryEducation.degree, primaryEducation.academicDiscipline].filter(Boolean).join(" · ")}</p><p className="mt-3 text-xs text-[#85938f]">{primaryEducation.startYear || "—"}–{primaryEducation.graduationYear || "Present"}</p></div> : <EmptySummary label="Education" section="education" />}
            </article>
            <article className="profile-summary-card">
              <div className="flex items-center justify-between gap-3"><h3 className="font-serif text-2xl text-[#214743]">Skills</h3><Link to="/dashboard/skills?view=my-skills" className="profile-edit-link">Open skill map</Link></div>
              {profile.skills.length ? <div className="mt-4 flex flex-wrap gap-2">{profile.skills.slice(0, 8).map((skill) => <span key={skill.id || skill.name} className="profile-chip">{skill.name}</span>)}</div> : <div className="mt-4 border-l-2 border-[#d6dfd8] pl-4"><p className="text-sm text-[#7b8b87]">No skills added yet.</p><Link to="/dashboard/skills?view=my-skills" className="mt-2 inline-block text-xs font-bold text-[#174b47] underline decoration-[#e9794a] underline-offset-4">Browse the central library</Link></div>}
            </article>
            <article className="profile-summary-card">
              <div className="flex items-center justify-between gap-3"><h3 className="font-serif text-2xl text-[#214743]">Projects</h3><Link to="/profile/edit?section=projects" className="profile-edit-link">Edit</Link></div>
              {profile.projects.length ? <div className="mt-4 space-y-3">{profile.projects.slice(0, 3).map((project) => <div key={project.id}><p className="font-bold text-[#294d49]">{project.title}</p><p className="mt-1 line-clamp-2 text-xs leading-5 text-[#748581]">{project.description || project.role || "Project details ready to expand."}</p></div>)}</div> : <EmptySummary label="Projects" section="projects" />}
            </article>
            <article className="profile-summary-card">
              <div className="flex items-center justify-between gap-3"><h3 className="font-serif text-2xl text-[#214743]">Experience</h3><Link to="/profile/edit?section=experience" className="profile-edit-link">Edit</Link></div>
              {profile.experience.length ? <div className="mt-4 space-y-3">{profile.experience.slice(0, 3).map((item) => <div key={item.id}><p className="font-bold text-[#294d49]">{item.position}</p><p className="mt-1 text-xs text-[#748581]">{item.organization} · {item.experienceType.replaceAll("_", " ")}</p></div>)}</div> : <EmptySummary label="Experience" section="experience" />}
            </article>
            <article className="profile-summary-card">
              <div className="flex items-center justify-between gap-3"><h3 className="font-serif text-2xl text-[#214743]">Certifications</h3><Link to="/profile/edit?section=certifications" className="profile-edit-link">Edit</Link></div>
              {profile.certifications.length ? <div className="mt-4 space-y-3">{profile.certifications.slice(0, 3).map((item) => <div key={item.id}><p className="font-bold text-[#294d49]">{item.name}</p><p className="mt-1 text-xs text-[#748581]">{item.issuer}</p></div>)}</div> : <EmptySummary label="Certifications" section="certifications" />}
            </article>
            <article className="profile-summary-card">
              <div className="flex items-center justify-between gap-3"><h3 className="font-serif text-2xl text-[#214743]">Career direction</h3><Link to="/profile/edit?section=preferences" className="profile-edit-link">Edit</Link></div>
              {profile.preferences.preferredRoles?.length ? <div className="mt-4"><p className="text-xs font-bold uppercase tracking-wider text-[#82918e]">Preferred roles</p><div className="mt-2 flex flex-wrap gap-2">{profile.preferences.preferredRoles.map((role) => <span key={role} className="profile-chip">{role}</span>)}</div><p className="mt-4 text-sm leading-6 text-[#667a76]">{profile.preferences.shortTermObjective || "Add a short-term objective to make this direction more concrete."}</p></div> : <EmptySummary label="Career preferences" section="preferences" />}
            </article>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="completeness-card">
            <div className="completion-orbit" style={{ "--completion": `${completion.overall * 3.6}deg` }}><span>{completion.overall}%</span></div>
            <p className="mt-5 text-center text-xs font-extrabold uppercase tracking-[0.15em] text-[#6f827e]">Profile completeness</p>
            <p className="mt-3 text-center text-xs leading-5 text-[#85938f]">This measures profile information only—not career readiness.</p>
            <div className="mt-6 space-y-3">{Object.entries(completion.sections).map(([key, section]) => <div key={key}><div className="flex justify-between text-xs font-bold text-[#4e6863]"><span>{section.label}</span><span>{section.percentage}%</span></div><div className="mt-1 h-1.5 bg-[#e2e8e3]"><span className="block h-full bg-[#e9794a]" style={{ width: `${section.percentage}%` }} /></div></div>)}</div>
            <Link to="/profile/edit" className="primary-button mt-7 w-full">Continue profile</Link>
          </section>
          <section className="border border-[#d4ddd6] bg-[#f8f6ef] p-6">
            <p className="eyebrow">Next best steps</p>
            <ul className="mt-4 space-y-4">{completion.suggestions.slice(0, 4).map((suggestion) => <li key={suggestion} className="flex gap-3 text-sm leading-6 text-[#5f746f]"><span className="mt-2 size-1.5 shrink-0 bg-[#e9794a]" />{suggestion}</li>)}</ul>
          </section>
          <section className="border border-[#d4ddd6] bg-white p-6">
            <p className="text-xs font-bold uppercase tracking-wider text-[#7c8e89]">Resume</p>
            <p className="mt-3 font-serif text-2xl text-[#214743]">{profile.resume ? "Resume secured" : "No resume uploaded"}</p>
            <p className="mt-2 text-sm leading-6 text-[#6b7d79]">{profile.resume ? `${profile.resume.filename} is available only through your authenticated account.` : "Upload a resume and optionally extract a reviewable profile draft."}</p>
            <Link to="/profile/edit?section=resume" className="mt-4 inline-block text-sm font-bold text-[#174b47] underline decoration-[#e9794a] decoration-2 underline-offset-4">Manage resume</Link>
          </section>
        </aside>
      </div>
    </AppShell>
  );
}

export default ProfilePage;
