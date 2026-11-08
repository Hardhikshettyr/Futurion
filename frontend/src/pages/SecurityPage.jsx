import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import PasswordField from "../components/PasswordField.jsx";
import PasswordStrength from "../components/PasswordStrength.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import AppShell from "../layouts/AppShell.jsx";
import {
  changePassword,
  getSessions,
  logoutAllDevices,
  revokeSession,
} from "../services/authApi.js";

function formatDate(value) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function SecurityPage() {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [sessionsError, setSessionsError] = useState("");
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);
  const [busySession, setBusySession] = useState("");
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  useEffect(() => {
    getSessions()
      .then((result) => setSessions(result.sessions))
      .catch((error) => setSessionsError(error.message))
      .finally(() => setIsLoadingSessions(false));
  }, []);

  function updatePasswordField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
    setPasswordError("");
    setPasswordMessage("");
  }

  async function handleChangePassword(event) {
    event.preventDefault();
    if (form.newPassword.length < 8) return setPasswordError("Use at least 8 characters for the new password");
    if (form.newPassword !== form.confirmPassword) return setPasswordError("New passwords do not match");
    setIsChangingPassword(true);
    try {
      const result = await changePassword(form);
      setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setPasswordMessage(result.message);
      if (!result.authenticated) {
        setUser(null);
        navigate("/login", { replace: true });
      } else {
        const refreshed = await getSessions();
        setSessions(refreshed.sessions);
      }
    } catch (error) {
      setPasswordError(error.message);
    } finally {
      setIsChangingPassword(false);
    }
  }

  async function handleRevoke(session) {
    setBusySession(session.id);
    try {
      const result = await revokeSession(session.id);
      if (result.currentSessionRevoked) {
        setUser(null);
        navigate("/login", { replace: true });
      } else {
        setSessions((current) => current.filter((item) => item.id !== session.id));
      }
    } catch (error) {
      setSessionsError(error.message);
    } finally {
      setBusySession("");
    }
  }

  async function handleLogoutAll() {
    setBusySession("all");
    try {
      await logoutAllDevices();
    } catch (error) {
      setSessionsError(error.message);
    } finally {
      setUser(null);
      navigate("/login", { replace: true });
    }
  }

  return (
    <AppShell eyebrow="Account settings" title="Security & sessions">
      <div className="grid gap-7 xl:grid-cols-2">
        <section className="border border-[#d4ddd6] bg-white p-6 shadow-[0_14px_35px_rgba(21,61,58,.05)] sm:p-8">
          <p className="eyebrow">Password</p>
          <h2 className="mt-2 font-serif text-3xl text-[#173f3c]">Change your password</h2>
          <p className="mt-3 text-sm leading-6 text-[#687a77]">Your current device stays signed in with rotated credentials. Every other session is revoked.</p>
          {passwordError && <div role="alert" className="mt-5 border-l-4 border-[#bd5b46] bg-[#fff4ef] px-4 py-3 text-sm text-[#7a3c30]">{passwordError}</div>}
          {passwordMessage && <div role="status" className="mt-5 border-l-4 border-[#57917f] bg-[#e9f4ef] px-4 py-3 text-sm text-[#315d55]">{passwordMessage}</div>}
          <form onSubmit={handleChangePassword} className="mt-6 space-y-5">
            <PasswordField id="currentPassword" name="currentPassword" label="Current password" value={form.currentPassword} onChange={updatePasswordField} autoComplete="current-password" />
            <PasswordField id="securityNewPassword" name="newPassword" label="New password" value={form.newPassword} onChange={updatePasswordField} autoComplete="new-password" />
            <PasswordStrength password={form.newPassword} />
            <PasswordField id="securityConfirmPassword" name="confirmPassword" label="Confirm new password" value={form.confirmPassword} onChange={updatePasswordField} autoComplete="new-password" />
            <button type="submit" disabled={isChangingPassword} className="primary-button w-full sm:w-auto">{isChangingPassword ? "Updating…" : "Update password"}</button>
          </form>
        </section>

        <section className="border border-[#d4ddd6] bg-white p-6 shadow-[0_14px_35px_rgba(21,61,58,.05)] sm:p-8">
          <div className="flex items-start justify-between gap-4">
            <div><p className="eyebrow">Devices</p><h2 className="mt-2 font-serif text-3xl text-[#173f3c]">Active sessions</h2></div>
            <button type="button" onClick={handleLogoutAll} disabled={busySession === "all"} className="text-xs font-bold text-[#a34c3a] underline underline-offset-4">Sign out all</button>
          </div>
          <p className="mt-3 text-sm leading-6 text-[#687a77]">Revoke any device you no longer recognize or use.</p>
          {sessionsError && <p role="alert" className="mt-5 text-sm text-[#a34c3a]">{sessionsError}</p>}
          <div className="mt-6 divide-y divide-[#e2e7e2]">
            {isLoadingSessions && <p className="py-5 text-sm text-[#748582]">Loading active sessions…</p>}
            {!isLoadingSessions && sessions.length === 0 && <p className="py-5 text-sm text-[#748582]">No active sessions found.</p>}
            {sessions.map((session) => (
              <article key={session.id} className="flex gap-4 py-5">
                <span className="grid size-10 shrink-0 place-items-center bg-[#edf2ee] text-lg" aria-hidden="true">◇</span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2"><h3 className="font-bold text-[#274b48]">{session.device}</h3>{session.current && <span className="bg-[#e1f0ea] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#267365]">Current</span>}</div>
                  <p className="mt-1 truncate text-xs text-[#7a8986]" title={session.userAgent}>{session.userAgent}</p>
                  <p className="mt-2 text-xs text-[#7a8986]">Last active {formatDate(session.lastUsedAt)}</p>
                </div>
                <button type="button" onClick={() => handleRevoke(session)} disabled={Boolean(busySession)} className="self-start text-xs font-bold text-[#a34c3a] hover:underline disabled:opacity-50">{busySession === session.id ? "Revoking…" : "Revoke"}</button>
              </article>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}

export default SecurityPage;
