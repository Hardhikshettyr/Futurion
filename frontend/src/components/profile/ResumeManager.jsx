import { useRef, useState } from "react";
import { useStudentProfile } from "../../context/StudentProfileContext.jsx";
import {
  downloadPrivateFile,
  parseResume,
  removeResume,
  uploadResume,
} from "../../services/profileApi.js";
import AiResumeReview from "./AiResumeReview.jsx";

function formatBytes(bytes) {
  if (!bytes) return "";
  return bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
    : `${Math.round(bytes / 1024)} KB`;
}

function ResumeManager() {
  const { profile, setProfile } = useStudentProfile();
  const input = useRef(null);
  const [progress, setProgress] = useState(0);
  const [isParsing, setIsParsing] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [extraction, setExtraction] = useState(null);

  async function handleUpload(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const allowed = ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
    if (!allowed.includes(file.type) || file.size > 8 * 1024 * 1024) {
      return setError("Choose a valid PDF, DOC, or DOCX file no larger than 8 MB.");
    }
    setError("");
    setMessage("");
    setProgress(1);
    setIsBusy(true);
    try {
      const result = await uploadResume(file, setProgress);
      setProfile(result.profile);
      setMessage(result.message);
      setExtraction(null);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setProgress(0);
      setIsBusy(false);
    }
  }

  async function download() {
    setError("");
    try {
      const blob = await downloadPrivateFile("resume");
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = profile.resume.filename;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function remove() {
    if (!window.confirm("Remove your current resume?")) return;
    setIsBusy(true);
    setError("");
    try {
      const result = await removeResume();
      setProfile(result.profile);
      setMessage(result.message);
      setExtraction(null);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsBusy(false);
    }
  }

  async function parse() {
    setIsParsing(true);
    setError("");
    setMessage("");
    try {
      const result = await parseResume();
      setExtraction(result.extraction);
      setMessage(result.notice);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsParsing(false);
    }
  }

  function imported(nextProfile, counts) {
    setProfile(nextProfile);
    setExtraction(null);
    const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
    setMessage(`${total} selected ${total === 1 ? "item was" : "items were"} imported. Review each profile section before relying on it.`);
  }

  return (
    <div className="space-y-6">
      {error && <div role="alert" className="profile-alert profile-alert-error">{error}</div>}
      {message && <div role="status" className="profile-alert profile-alert-success">{message}</div>}
      <input ref={input} type="file" className="sr-only" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={handleUpload} />

      <section className="resume-vault">
        <div className="relative z-10 max-w-2xl">
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#f2a078]">Private document vault</p>
          <h3 className="mt-3 font-serif text-3xl text-white sm:text-4xl">Your resume stays behind authentication.</h3>
          <p className="mt-4 text-sm leading-7 text-[#c2d7d1]">Files receive server-generated names and are never exposed through a public storage URL. PDF, DOC, or DOCX; maximum 8 MB.</p>
          {profile.resume ? (
            <div className="mt-6 border border-white/15 bg-white/8 p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="font-bold text-white">{profile.resume.filename}</p>
                  <p className="mt-1 text-xs text-[#aec8c1]">{formatBytes(profile.resume.size)} · Uploaded {new Date(profile.resume.uploadedAt).toLocaleDateString()}</p>
                </div>
                <span className="bg-[#dff1e9] px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-[#21675b]">Private</span>
              </div>
              <div className="mt-5 flex flex-wrap gap-3">
                <button type="button" onClick={download} className="ai-outline-button">Download</button>
                <button type="button" onClick={() => input.current?.click()} disabled={isBusy} className="ai-outline-button">Replace</button>
                <button type="button" onClick={remove} disabled={isBusy} className="ai-outline-button text-[#ffc7b4]">Delete</button>
              </div>
            </div>
          ) : (
            <button type="button" onClick={() => input.current?.click()} className="mt-7 inline-flex min-h-12 items-center bg-[#f19a69] px-5 text-sm font-extrabold text-[#173f3c]">Upload resume</button>
          )}
          {progress > 0 && <div className="mt-5"><div className="flex justify-between text-xs font-bold text-[#d4e5e0]"><span>Uploading securely</span><span>{Math.round(progress)}%</span></div><progress value={progress} max="100" className="mt-2 h-2 w-full accent-[#f19a69]" /></div>}
        </div>
      </section>

      {profile.resume && (
        <section className="border border-[#d4ddd6] bg-white p-6 shadow-[0_16px_35px_rgba(18,60,58,.06)] sm:p-8">
          <div className="grid gap-5 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <p className="eyebrow">Resume information extraction</p>
              <h3 className="mt-2 font-serif text-3xl text-[#214743]">Turn your resume into a reviewable draft.</h3>
              <p className="mt-3 text-sm leading-6 text-[#6c7d79]">Extract possible profile information into a reviewable draft. Nothing is verified or saved until you select and confirm it.</p>
              {profile.resume.mimeType !== "application/pdf" && <p className="profile-feedback profile-feedback-action mt-3">Information extraction requires a PDF. You can still download, replace or remove this resume.</p>}
              {!profile.capabilities.resumeParsingAvailable && <p className="profile-feedback profile-feedback-info mt-3">Information extraction is currently unavailable. Manual profile editing remains available.</p>}
            </div>
            <button type="button" onClick={parse} disabled={isParsing || !profile.capabilities.resumeParsingAvailable || profile.resume.mimeType !== "application/pdf"} className="primary-button">{isParsing ? "Extracting information…" : "Review extracted information"}</button>
          </div>
        </section>
      )}

      {extraction && <AiResumeReview extraction={extraction} profile={profile} onCancel={() => setExtraction(null)} onImported={imported} />}
    </div>
  );
}

export default ResumeManager;
