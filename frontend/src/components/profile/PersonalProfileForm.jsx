import { useEffect, useMemo, useRef, useState } from "react";
import usePrivateImage from "../../hooks/usePrivateImage.js";
import { useStudentProfile } from "../../context/StudentProfileContext.jsx";
import {
  removeProfilePhoto,
  updatePersonal,
  uploadProfilePhoto,
} from "../../services/profileApi.js";
import { TextareaField, TextField } from "./ProfileFields.jsx";

const PERSONAL_KEYS = ["name", "phone", "city", "state", "country", "headline", "summary", "linkedInUrl", "githubUrl", "portfolioUrl"];

function pickPersonal(personal) {
  return Object.fromEntries(PERSONAL_KEYS.map((key) => [key, personal[key] || ""]));
}

function PersonalProfileForm({ onDirtyChange }) {
  const { profile, setProfile } = useStudentProfile();
  const original = useMemo(() => pickPersonal(profile.personal), [profile.personal]);
  const [form, setForm] = useState(original);
  const [status, setStatus] = useState({ error: "", message: "", saving: false });
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInput = useRef(null);
  const photoUrl = usePrivateImage(Boolean(profile.personal.photo), profile.personal.photo?.uploadedAt);

  useEffect(() => setForm(pickPersonal(profile.personal)), [profile.personal]);
  useEffect(() => {
    onDirtyChange(JSON.stringify(form) !== JSON.stringify(original));
  }, [form, onDirtyChange, original]);

  function change(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
    setStatus({ error: "", message: "", saving: false });
  }

  async function save(event) {
    event.preventDefault();
    if (!form.name.trim()) return setStatus({ error: "Name is required.", message: "", saving: false });
    setStatus({ error: "", message: "", saving: true });
    try {
      const result = await updatePersonal(form);
      setProfile(result.profile);
      setStatus({ error: "", message: result.message, saving: false });
      onDirtyChange(false);
    } catch (error) {
      setStatus({ error: error.message, message: "", saving: false });
    }
  }

  async function uploadPhoto(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!(["image/jpeg", "image/png", "image/webp"].includes(file.type)) || file.size > 3 * 1024 * 1024) {
      return setStatus({ error: "Choose a JPG, PNG, or WebP image no larger than 3 MB.", message: "", saving: false });
    }
    setUploadProgress(1);
    setStatus({ error: "", message: "", saving: true });
    try {
      const result = await uploadProfilePhoto(file, setUploadProgress);
      setProfile(result.profile);
      setStatus({ error: "", message: result.message, saving: false });
    } catch (error) {
      setStatus({ error: error.message, message: "", saving: false });
    } finally {
      setUploadProgress(0);
    }
  }

  async function removePhoto() {
    setStatus({ error: "", message: "", saving: true });
    try {
      const result = await removeProfilePhoto();
      setProfile(result.profile);
      setStatus({ error: "", message: result.message, saving: false });
    } catch (error) {
      setStatus({ error: error.message, message: "", saving: false });
    }
  }

  return (
    <form onSubmit={save} className="space-y-6">
      {status.error && <div role="alert" className="profile-alert profile-alert-error">{status.error}</div>}
      {status.message && <div role="status" className="profile-alert profile-alert-success">{status.message}</div>}
      <section className="flex flex-col gap-5 border border-[#d4ddd6] bg-[#f8f9f5] p-5 sm:flex-row sm:items-center">
        <div className="profile-photo-frame">
          {photoUrl ? <img src={photoUrl} alt={`${profile.personal.name}'s profile`} /> : <span aria-hidden="true">{profile.personal.name.slice(0, 1).toUpperCase()}</span>}
        </div>
        <div>
          <h3 className="font-serif text-2xl text-[#244b47]">Profile photo</h3>
          <p className="mt-1 text-sm text-[#6d7e7a]">JPG, PNG, or WebP. Maximum 3 MB.</p>
          {uploadProgress > 0 && <progress value={uploadProgress} max="100" className="mt-3 w-full accent-[#e9794a]" aria-label="Photo upload progress" />}
          <div className="mt-4 flex flex-wrap gap-3">
            <input ref={fileInput} type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" onChange={uploadPhoto} className="sr-only" />
            <button type="button" className="secondary-button" onClick={() => fileInput.current?.click()}>{profile.personal.photo ? "Replace photo" : "Upload photo"}</button>
            {profile.personal.photo && <button type="button" onClick={removePhoto} className="text-sm font-bold text-[#a34c3a] underline underline-offset-4">Remove</button>}
          </div>
        </div>
      </section>
      <div className="grid gap-5 md:grid-cols-2">
        <TextField id="profile-name" name="name" label="Full name" value={form.name} onChange={change} />
        <TextField id="profile-email" label="Account email" value={profile.personal.email} readOnly hint="Email is managed by your Futurion account." />
        <TextField id="profile-phone" name="phone" label="Phone number" value={form.phone} onChange={change} />
        <TextField id="profile-headline" name="headline" label="Professional headline" value={form.headline} onChange={change} />
        <TextField id="profile-city" name="city" label="City" value={form.city} onChange={change} />
        <TextField id="profile-state" name="state" label="State" value={form.state} onChange={change} />
        <TextField id="profile-country" name="country" label="Country" value={form.country} onChange={change} />
        <div />
        <div className="md:col-span-2"><TextareaField id="profile-summary" name="summary" label="Professional summary" value={form.summary} onChange={change} rows={6} /></div>
        <TextField id="profile-linkedin" name="linkedInUrl" type="url" label="LinkedIn URL" value={form.linkedInUrl} onChange={change} />
        <TextField id="profile-github" name="githubUrl" type="url" label="GitHub URL" value={form.githubUrl} onChange={change} />
        <TextField id="profile-portfolio" name="portfolioUrl" type="url" label="Portfolio URL" value={form.portfolioUrl} onChange={change} />
      </div>
      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={status.saving} className="primary-button">{status.saving ? "Saving…" : "Save personal information"}</button>
        <button type="button" onClick={() => setForm(original)} className="text-sm font-bold text-[#5e7470] underline underline-offset-4">Cancel changes</button>
      </div>
    </form>
  );
}

export default PersonalProfileForm;
