import { useEffect, useMemo, useState } from "react";
import { useStudentProfile } from "../../context/StudentProfileContext.jsx";
import { updatePreferences } from "../../services/profileApi.js";
import { TagsField, TextareaField } from "./ProfileFields.jsx";

const DEFAULTS = {
  preferredRoles: [], preferredIndustries: [], careerInterests: [], workModes: [],
  employmentTypes: [], preferredLocations: [], willingToRelocate: false,
  areasToExplore: [], shortTermObjective: "", longTermObjective: "",
};

function PreferencesForm({ onDirtyChange }) {
  const { profile, setProfile } = useStudentProfile();
  const original = useMemo(
    () => ({ ...DEFAULTS, ...profile.preferences }),
    [profile.preferences],
  );
  const [form, setForm] = useState(original);
  const [status, setStatus] = useState({ error: "", message: "", saving: false });

  useEffect(() => setForm(original), [original]);
  useEffect(() => {
    onDirtyChange(JSON.stringify(form) !== JSON.stringify(original));
  }, [form, onDirtyChange, original]);

  function set(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
    setStatus({ error: "", message: "", saving: false });
  }

  async function save(event) {
    event.preventDefault();
    setStatus({ error: "", message: "", saving: true });
    try {
      const result = await updatePreferences(form);
      setProfile(result.profile);
      setStatus({ error: "", message: result.message, saving: false });
      onDirtyChange(false);
    } catch (error) {
      setStatus({ error: error.message, message: "", saving: false });
    }
  }

  return (
    <form onSubmit={save} className="space-y-6">
      {status.error && <div role="alert" className="profile-alert profile-alert-error">{status.error}</div>}
      {status.message && <div role="status" className="profile-alert profile-alert-success">{status.message}</div>}
      <div className="grid gap-5 md:grid-cols-2">
        <TagsField id="preferred-roles" label="Preferred roles" value={form.preferredRoles} onChange={(value) => set("preferredRoles", value)} />
        <TagsField id="preferred-industries" label="Preferred industries" value={form.preferredIndustries} onChange={(value) => set("preferredIndustries", value)} />
        <TagsField id="career-interests" label="Career interests" value={form.careerInterests} onChange={(value) => set("careerInterests", value)} />
        <TagsField id="employment-types" label="Employment types" value={form.employmentTypes} onChange={(value) => set("employmentTypes", value)} />
        <TagsField id="preferred-locations" label="Preferred locations" value={form.preferredLocations} onChange={(value) => set("preferredLocations", value)} />
        <TagsField id="areas-explore" label="Areas to explore" value={form.areasToExplore} onChange={(value) => set("areasToExplore", value)} />
      </div>
      <fieldset>
        <legend className="text-sm font-bold text-[#294a4c]">Preferred work modes</legend>
        <div className="mt-3 flex flex-wrap gap-3">
          {["remote", "hybrid", "on_site"].map((mode) => (
            <label key={mode} className="flex items-center gap-2 border border-[#d4ddd6] bg-white px-4 py-3 text-sm font-semibold text-[#365753]">
              <input type="checkbox" className="size-4 accent-[#e9794a]" checked={form.workModes.includes(mode)} onChange={(event) => set("workModes", event.target.checked ? [...form.workModes, mode] : form.workModes.filter((item) => item !== mode))} />
              {mode.replace("_", " ")}
            </label>
          ))}
        </div>
      </fieldset>
      <label className="flex items-center gap-3 border-l-4 border-[#6c9c90] bg-[#edf4ef] px-4 py-3 text-sm font-bold text-[#365753]">
        <input type="checkbox" checked={form.willingToRelocate} onChange={(event) => set("willingToRelocate", event.target.checked)} className="size-4 accent-[#e9794a]" />
        I am willing to relocate for the right opportunity.
      </label>
      <TextareaField id="short-objective" label="Short-term career objective" value={form.shortTermObjective} onChange={(event) => set("shortTermObjective", event.target.value)} />
      <TextareaField id="long-objective" label="Long-term career objective" value={form.longTermObjective} onChange={(event) => set("longTermObjective", event.target.value)} />
      <p className="text-xs leading-5 text-[#788986]">Your preferences are yours to define—they are never inferred solely from your academic degree.</p>
      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={status.saving} className="primary-button">{status.saving ? "Saving…" : "Save career preferences"}</button>
        <button type="button" onClick={() => setForm(original)} className="text-sm font-bold text-[#5e7470] underline underline-offset-4">Cancel changes</button>
      </div>
    </form>
  );
}

export default PreferencesForm;
