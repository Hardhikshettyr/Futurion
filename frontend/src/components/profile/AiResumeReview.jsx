import { useMemo, useState } from "react";
import { importResumeSelection } from "../../services/profileApi.js";

const PERSONAL_LABELS = {
  fullName: "Full name", phone: "Phone", city: "City", country: "Country",
  headline: "Professional headline", summary: "Professional summary",
  linkedInUrl: "LinkedIn", githubUrl: "GitHub", portfolioUrl: "Portfolio",
};

const SECTION_TITLES = {
  education: "Education", skills: "Skills", projects: "Projects",
  experience: "Experience", certifications: "Certifications",
};

const NUMBER_FIELDS = new Set(["startYear", "graduationYear"]);
const BOOLEAN_FIELDS = new Set(["ongoing", "currentlyWorking"]);

function hasValue(value) {
  return Array.isArray(value) ? value.length > 0 : value !== null && value !== "";
}

function currentPersonalValue(profile, key) {
  if (key === "fullName") return profile.personal.name;
  return profile.personal[key] || "Not added";
}

function allSelection(data) {
  return {
    personal: Object.entries(data.personal).filter(([, value]) => hasValue(value)).map(([key]) => key),
    ...Object.fromEntries(Object.keys(SECTION_TITLES).map((section) => [section, data[section].map((_, index) => index)])),
  };
}

function recordIdentity(section, record) {
  if (section === "education") return record.institution;
  if (section === "skills") return record.name;
  if (section === "projects") return record.title;
  if (section === "experience") return `${record.organization || ""} ${record.position || ""}`.trim();
  return `${record.name || ""} ${record.issuer || ""}`.trim();
}

function conflictExists(profile, section, record) {
  const identity = recordIdentity(section, record).toLowerCase();
  if (!identity) return false;
  return profile[section].some((current) =>
    recordIdentity(section, current).toLowerCase() === identity,
  );
}

function AiResumeReview({ extraction, onCancel, onImported, profile }) {
  const [draft, setDraft] = useState(() => structuredClone(extraction));
  const [selection, setSelection] = useState(() => allSelection(extraction));
  const [status, setStatus] = useState({ error: "", saving: false });
  const selectedCount = useMemo(
    () => Object.values(selection).reduce((sum, values) => sum + values.length, 0),
    [selection],
  );

  function toggle(section, value) {
    setSelection((current) => ({
      ...current,
      [section]: current[section].includes(value)
        ? current[section].filter((item) => item !== value)
        : [...current[section], value],
    }));
  }

  function updatePersonal(key, value) {
    setDraft((current) => ({ ...current, personal: { ...current.personal, [key]: value } }));
  }

  function updateRecord(section, index, key, value) {
    setDraft((current) => ({
      ...current,
      [section]: current[section].map((record, itemIndex) =>
        itemIndex === index ? { ...record, [key]: value } : record,
      ),
    }));
  }

  async function confirm() {
    if (!selectedCount) return setStatus({ error: "Select at least one field or record to import.", saving: false });
    setStatus({ error: "", saving: true });
    try {
      const result = await importResumeSelection(draft, selection);
      onImported(result.profile, result.imported);
    } catch (error) {
      setStatus({ error: error.message, saving: false });
    }
  }

  return (
    <section className="ai-review-panel" aria-labelledby="ai-review-title">
      <div className="flex flex-col gap-4 border-b border-white/10 pb-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#f1a17b]">Extracted information draft</p>
          <h3 id="ai-review-title" className="mt-2 font-serif text-3xl text-white">Review before anything is saved.</h3>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#c6d9d4]">This information is unverified. Correct inaccuracies, resolve possible duplicates and select only the details you want to add. Existing records are preserved.</p>
        </div>
        <span className="shrink-0 border border-white/15 px-3 py-2 text-xs font-bold text-[#d9e7e3]">{selectedCount} selected</span>
      </div>

      {status.error && <div role="alert" className="mt-5 profile-alert profile-alert-error">{status.error}</div>}
      {draft.warnings?.length > 0 && <div className="mt-5 border-l-4 border-[#efad78] bg-white/8 px-4 py-3 text-sm text-[#f2ddd1]">{draft.warnings.join(" ")}</div>}

      <div className="mt-7 flex flex-wrap gap-3">
        <button type="button" onClick={() => setSelection(allSelection(draft))} className="ai-outline-button">Select all extracted</button>
        <button type="button" onClick={() => setSelection({ personal: [], education: [], skills: [], projects: [], experience: [], certifications: [] })} className="ai-outline-button">Clear selection</button>
      </div>

      <div className="mt-8 space-y-8">
        <section>
          <h4 className="font-serif text-2xl text-white">Personal information</h4>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {Object.entries(draft.personal).filter(([, value]) => hasValue(value)).map(([key, value]) => (
              <label key={key} className="ai-review-record">
                <span className="flex items-center gap-3 text-sm font-bold text-white"><input type="checkbox" checked={selection.personal.includes(key)} onChange={() => toggle("personal", key)} className="size-4 accent-[#f19a69]" />{PERSONAL_LABELS[key]}</span>
                <span className="mt-3 block text-[10px] font-bold uppercase tracking-wider text-[#8eb5ac]">Current</span>
                <span className="mt-1 block text-xs text-[#c3d7d2]">{currentPersonalValue(profile, key)}</span>
                {key === "summary" ? (
                  <textarea value={value || ""} onChange={(event) => updatePersonal(key, event.target.value)} rows="4" className="ai-review-input mt-3" />
                ) : (
                  <input value={value || ""} onChange={(event) => updatePersonal(key, event.target.value)} className="ai-review-input mt-3" />
                )}
              </label>
            ))}
          </div>
        </section>

        {Object.entries(SECTION_TITLES).map(([section, title]) => (
          <section key={section}>
            <h4 className="font-serif text-2xl text-white">{title}</h4>
            {draft[section].length === 0 ? <p className="mt-3 text-sm text-[#a9c4bd]">Nothing reliable was extracted for this section.</p> : (
              <div className="mt-4 space-y-4">
                {draft[section].map((record, index) => (
                  <article key={index} className="ai-review-record">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <label className="flex items-center gap-3 text-sm font-bold text-white"><input type="checkbox" checked={selection[section].includes(index)} onChange={() => toggle(section, index)} className="size-4 accent-[#f19a69]" />{recordIdentity(section, record) || `${title} ${index + 1}`}</label>
                      {conflictExists(profile, section, record) && <span className="bg-[#754b3b] px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[#ffd8c7]">Matches an existing record</span>}
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      {Object.entries(record).map(([key, value]) => (
                        <label key={key} className="text-[10px] font-bold uppercase tracking-wider text-[#8eb5ac]">
                          {key.replace(/([A-Z])/g, " $1")}
                          {Array.isArray(value) ? (
                            <input value={value.join(", ")} onChange={(event) => updateRecord(section, index, key, event.target.value.split(",").map((item) => item.trim()).filter(Boolean))} className="ai-review-input mt-1 normal-case tracking-normal" />
                          ) : BOOLEAN_FIELDS.has(key) ? (
                            <select value={String(value ?? false)} onChange={(event) => updateRecord(section, index, key, event.target.value === "true")} className="ai-review-input mt-1 normal-case tracking-normal"><option value="false">No</option><option value="true">Yes</option></select>
                          ) : (
                            <input value={value ?? ""} type={NUMBER_FIELDS.has(key) ? "number" : "text"} onChange={(event) => updateRecord(section, index, key, NUMBER_FIELDS.has(key) ? (event.target.value ? Number(event.target.value) : null) : event.target.value)} className="ai-review-input mt-1 normal-case tracking-normal" />
                          )}
                        </label>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        ))}
      </div>

      <div className="mt-8 flex flex-wrap gap-3 border-t border-white/10 pt-6">
        <button type="button" onClick={confirm} disabled={status.saving} className="inline-flex min-h-12 items-center bg-[#f19a69] px-5 text-sm font-extrabold text-[#173f3c] disabled:opacity-60">{status.saving ? "Importing…" : "Confirm selected changes"}</button>
        <button type="button" onClick={onCancel} className="ai-outline-button">Discard draft</button>
      </div>
    </section>
  );
}

export default AiResumeReview;
