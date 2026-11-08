import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "../layouts/AuthLayout.jsx";
import { requestPasswordReset } from "../services/authApi.js";

function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) return setError("Enter a valid email address");
    setIsSubmitting(true);
    setError("");
    try {
      await requestPasswordReset(normalizedEmail);
      window.sessionStorage.setItem("futurion.resetEmail", normalizedEmail);
      navigate("/reset-password", { state: { email: normalizedEmail } });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthLayout activeStep={3}>
      <div className="max-w-xl">
        <p className="eyebrow">Account recovery</p>
        <h2 className="mt-3 font-serif text-4xl leading-tight text-[#173f3c] sm:text-5xl">Find your way back in.</h2>
        <p className="mt-4 text-base leading-7 text-[#637575]">Enter your email. If an eligible account exists, we’ll send a ten-minute reset code.</p>
        <form onSubmit={handleSubmit} className="mt-8" noValidate>
          <label htmlFor="recovery-email" className="mb-2 block text-sm font-semibold text-[#294a4c]">Email address</label>
          <input id="recovery-email" type="email" value={email} onChange={(event) => { setEmail(event.target.value); setError(""); }} className={`field-input ${error ? "field-input-error" : ""}`} autoComplete="email" placeholder="you@example.com" />
          {error && <p role="alert" className="field-error">{error}</p>}
          <button type="submit" disabled={isSubmitting} className="primary-button mt-6">
            {isSubmitting ? <><span className="button-spinner" />Sending…</> : "Send reset code"}
          </button>
        </form>
        <Link to="/login" className="mt-7 inline-block text-sm font-bold text-[#496865]">← Back to sign in</Link>
      </div>
    </AuthLayout>
  );
}

export default ForgotPasswordPage;
