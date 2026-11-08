import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import OtpInput from "../components/OtpInput.jsx";
import PasswordField from "../components/PasswordField.jsx";
import PasswordStrength from "../components/PasswordStrength.jsx";
import AuthLayout from "../layouts/AuthLayout.jsx";
import { resetPassword } from "../services/authApi.js";

function ResetPasswordPage() {
  const location = useLocation();
  const [email, setEmail] = useState(
    location.state?.email || window.sessionStorage.getItem("futurion.resetEmail") || "",
  );
  const [form, setForm] = useState({ otp: "", newPassword: "", confirmPassword: "" });
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  function updateField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
    setFieldErrors((current) => ({ ...current, [event.target.name]: "" }));
    setError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (isSubmitting) return;
    const errors = {};
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) errors.email = "Enter a valid email address";
    if (form.otp.length !== 6) errors.otp = "Enter the six-digit reset code";
    if (form.newPassword.length < 8) errors.newPassword = "Use at least 8 characters";
    if (form.newPassword !== form.confirmPassword) errors.confirmPassword = "Passwords do not match";
    if (Object.keys(errors).length) return setFieldErrors(errors);

    setIsSubmitting(true);
    setError("");
    try {
      await resetPassword({
        email,
        otp: form.otp,
        newPassword: form.newPassword,
        confirmPassword: form.confirmPassword,
      });
      window.sessionStorage.removeItem("futurion.resetEmail");
      setIsComplete(true);
    } catch (requestError) {
      setError(requestError.message);
      if (Array.isArray(requestError.payload?.errors)) {
        setFieldErrors(Object.fromEntries(requestError.payload.errors.map((item) => [item.field, item.message])));
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isComplete) {
    return (
      <AuthLayout activeStep={3}>
        <div className="max-w-xl">
          <div className="success-mark" aria-hidden="true">✓</div>
          <p className="eyebrow mt-7">Password updated</p>
          <h2 className="mt-3 font-serif text-4xl text-[#173f3c] sm:text-5xl">Your account has a fresh key.</h2>
          <p className="mt-5 text-base leading-7 text-[#637575]">Every existing session was signed out. Use your new password to sign in again.</p>
          <Link to="/login" className="primary-button mt-8 inline-flex">Continue to sign in →</Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout activeStep={3}>
      <div className="max-w-xl">
        <p className="eyebrow">Account recovery</p>
        <h2 className="mt-3 font-serif text-4xl leading-tight text-[#173f3c] sm:text-5xl">Choose a new password.</h2>
        <p className="mt-4 text-base leading-7 text-[#637575]">Enter the code from your email and a password you haven’t used for this account.</p>
        {error && <div role="alert" className="mt-6 border-l-4 border-[#bd5b46] bg-[#fff4ef] px-4 py-3 text-sm text-[#7a3c30]">{error}</div>}

        <form onSubmit={handleSubmit} className="mt-8 space-y-5" noValidate>
          <div>
            <label htmlFor="reset-email" className="mb-2 block text-sm font-semibold text-[#294a4c]">Email address</label>
            <input id="reset-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} className={`field-input ${fieldErrors.email ? "field-input-error" : ""}`} autoComplete="email" />
            {fieldErrors.email && <p className="field-error">{fieldErrors.email}</p>}
          </div>
          <fieldset>
            <legend className="mb-3 text-sm font-semibold text-[#294a4c]">Reset code</legend>
            <OtpInput value={form.otp} onChange={(otp) => { setForm((current) => ({ ...current, otp })); setFieldErrors((current) => ({ ...current, otp: "" })); }} hasError={Boolean(fieldErrors.otp)} />
            {fieldErrors.otp && <p className="field-error">{fieldErrors.otp}</p>}
          </fieldset>
          <PasswordField id="newPassword" name="newPassword" label="New password" value={form.newPassword} onChange={updateField} autoComplete="new-password" error={fieldErrors.newPassword} />
          <PasswordStrength password={form.newPassword} />
          <PasswordField id="resetConfirmPassword" name="confirmPassword" label="Confirm new password" value={form.confirmPassword} onChange={updateField} autoComplete="new-password" error={fieldErrors.confirmPassword} />
          <button type="submit" disabled={isSubmitting} className="primary-button w-full sm:w-auto">
            {isSubmitting ? <><span className="button-spinner" />Updating password…</> : "Set new password"}
          </button>
        </form>
        <Link to="/forgot-password" className="mt-7 inline-block text-sm font-bold text-[#496865]">Request another code</Link>
      </div>
    </AuthLayout>
  );
}

export default ResetPasswordPage;
