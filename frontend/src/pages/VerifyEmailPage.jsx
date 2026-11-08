import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import OtpInput from "../components/OtpInput.jsx";
import AuthLayout from "../layouts/AuthLayout.jsx";
import {
  resendVerificationEmail,
  verifyStudentEmail,
} from "../services/authApi.js";
import { EMAIL_PATTERN } from "../utils/authValidation.js";
import {
  clearVerificationSession,
  getVerificationSession,
  saveVerificationSession,
  updateResendCooldown,
} from "../utils/verificationSession.js";

function VerifyEmailPage() {
  const location = useLocation();
  const session = useMemo(() => getVerificationSession(), []);
  const initialEmail = location.state?.email || session.email;
  const [email, setEmail] = useState(initialEmail);
  const [emailConfirmed, setEmailConfirmed] = useState(Boolean(initialEmail));
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState(
    location.state?.deliveryFailed
      ? "Your first email could not be delivered. Request a new code below."
      : "",
  );
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [resendAt, setResendAt] = useState(session.resendAt);
  const [secondsLeft, setSecondsLeft] = useState(() =>
    Math.max(0, Math.ceil((session.resendAt - Date.now()) / 1000)),
  );

  useEffect(() => {
    const updateCountdown = () => {
      setSecondsLeft(Math.max(0, Math.ceil((resendAt - Date.now()) / 1000)));
    };

    updateCountdown();
    const interval = window.setInterval(updateCountdown, 500);
    return () => window.clearInterval(interval);
  }, [resendAt]);

  function handleOtpChange(nextOtp) {
    setOtp(nextOtp);
    setError("");
  }

  async function handleVerify(event) {
    event.preventDefault();
    if (isVerifying || otp.length !== 6) return;

    setIsVerifying(true);
    setError("");
    setNotice("");

    try {
      await verifyStudentEmail({ email, otp });
      clearVerificationSession();
      setIsVerified(true);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsVerifying(false);
    }
  }

  async function handleResend() {
    if (isResending || secondsLeft > 0) return;

    const normalizedEmail = email.trim().toLowerCase();
    if (!EMAIL_PATTERN.test(normalizedEmail)) {
      setError("Enter a valid email address");
      return;
    }

    setIsResending(true);
    setError("");

    try {
      const result = await resendVerificationEmail(normalizedEmail);
      const cooldown = result.verification?.resendCooldownSeconds || 60;
      const nextResendAt = Date.now() + cooldown * 1000;
      setEmail(normalizedEmail);
      setEmailConfirmed(true);
      setOtp("");
      setNotice(result.message);
      setResendAt(nextResendAt);
      saveVerificationSession(normalizedEmail, cooldown);
      updateResendCooldown(cooldown);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsResending(false);
    }
  }

  if (isVerified) {
    return (
      <AuthLayout activeStep={3}>
        <div className="max-w-xl py-8 text-center sm:text-left">
          <div className="success-mark mx-auto sm:mx-0" aria-hidden="true">
            <svg viewBox="0 0 24 24" className="size-9" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="m5 12.5 4.2 4.2L19 7" /></svg>
          </div>
          <p className="eyebrow mt-7">Email confirmed</p>
          <h2 className="mt-3 font-serif text-4xl leading-tight text-[#173f3c] sm:text-5xl">You’re ready for what comes next.</h2>
          <p className="mt-5 text-base leading-7 text-[#637575]">Your Futurion account is verified. Sign in to begin building your student profile and exploring career directions.</p>
          <Link to="/login" className="primary-button mt-8 inline-flex min-w-48">Continue to sign in <span aria-hidden="true">→</span></Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout activeStep={2}>
      <div className="max-w-xl">
        <p className="eyebrow">Secure your account</p>
        <h2 className="mt-3 font-serif text-4xl leading-tight tracking-[-0.02em] text-[#173f3c] sm:text-5xl">One quick check before we begin.</h2>

        {!emailConfirmed ? (
          <div className="mt-8 border-l-4 border-[#e9794a] bg-white px-5 py-5 shadow-[0_12px_35px_rgba(23,63,60,0.06)]">
            <p className="text-sm leading-6 text-[#5f7271]">Enter the email used for registration. We’ll send a fresh six-digit code if the account is eligible.</p>
            <label htmlFor="verification-email" className="mb-2 mt-5 block text-sm font-semibold text-[#294a4c]">Email address</label>
            <input id="verification-email" type="email" value={email} onChange={(event) => { setEmail(event.target.value); setError(""); }} className="field-input" placeholder="you@example.com" autoComplete="email" />
            {error && <p role="alert" className="field-error">{error}</p>}
            <button type="button" onClick={handleResend} disabled={isResending} className="primary-button mt-5">
              {isResending ? <><span className="button-spinner" />Requesting code…</> : "Send verification code"}
            </button>
          </div>
        ) : (
          <>
            <p className="mt-5 text-base leading-7 text-[#637575]">We sent a six-digit code to <strong className="font-semibold text-[#294a4c]">{email}</strong>. It expires in five minutes.</p>

            {notice && <div role="status" className="mt-6 border-l-4 border-[#6b9e91] bg-[#eaf3ef] px-4 py-3 text-sm leading-6 text-[#315d55]">{notice}</div>}
            {error && <div role="alert" className="mt-6 border-l-4 border-[#bd5b46] bg-[#fff4ef] px-4 py-3 text-sm leading-6 text-[#7a3c30]">{error}</div>}

            <form onSubmit={handleVerify} className="mt-8">
              <fieldset disabled={isVerifying}>
                <legend className="mb-3 text-sm font-semibold text-[#294a4c]">Verification code</legend>
                <OtpInput value={otp} onChange={handleOtpChange} disabled={isVerifying} hasError={Boolean(error)} />
              </fieldset>

              <button type="submit" disabled={isVerifying || otp.length !== 6} className="primary-button mt-7 w-full sm:w-auto sm:min-w-52">
                {isVerifying ? <><span className="button-spinner" />Checking code…</> : "Verify my email"}
              </button>
            </form>

            <div className="mt-8 flex flex-col gap-3 border-t border-[#d7ddd7] pt-6 text-sm text-[#667978] sm:flex-row sm:items-center sm:justify-between">
              <span>Didn’t receive it?</span>
              <button type="button" onClick={handleResend} disabled={isResending || secondsLeft > 0} className="w-fit font-bold text-[#174b47] underline decoration-[#e9794a] decoration-2 underline-offset-4 disabled:cursor-not-allowed disabled:text-[#8b9997] disabled:no-underline">
                {isResending ? "Sending…" : secondsLeft > 0 ? `Resend in ${secondsLeft}s` : "Resend verification code"}
              </button>
            </div>
          </>
        )}

        <div className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-sm">
          <Link to="/register" onClick={clearVerificationSession} className="font-semibold text-[#536c6a] hover:text-[#174b47]">← Correct the email</Link>
          <Link to="/login" className="font-semibold text-[#536c6a] hover:text-[#174b47]">Back to sign in</Link>
        </div>
      </div>
    </AuthLayout>
  );
}

export default VerifyEmailPage;
