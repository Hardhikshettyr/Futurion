import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import PasswordField from "../components/PasswordField.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import AuthLayout from "../layouts/AuthLayout.jsx";
import { saveVerificationSession } from "../utils/verificationSession.js";

function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [form, setForm] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [unverified, setUnverified] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function updateField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
    setErrors((current) => ({ ...current, [event.target.name]: "" }));
    setFormError("");
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (isSubmitting) return;
    const nextErrors = {};
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) nextErrors.email = "Enter a valid email address";
    if (!form.password) nextErrors.password = "Enter your password";
    if (Object.keys(nextErrors).length) return setErrors(nextErrors);

    setIsSubmitting(true);
    setUnverified(false);
    login({ email: form.email, password: form.password })
      .then(() => {
        navigate(location.state?.from || "/dashboard", { replace: true });
      })
      .catch((error) => {
        setFormError(error.message);
        setUnverified(error.code === "EMAIL_NOT_VERIFIED");
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  }

  function continueVerification() {
    const email = form.email.trim().toLowerCase();
    saveVerificationSession(email, 0);
    navigate("/verify-email", { state: { email, deliveryFailed: true } });
  }

  return (
    <AuthLayout activeStep={3} variant="login">
      <div className="auth-form-content">
        <p className="auth-eyebrow">Returning student</p>
        <h2>Welcome back to your <em>next move.</em></h2>
        <p className="auth-form-intro">Sign in to continue shaping your career path.</p>

        {formError && (
          <div role="alert" className="auth-form-alert">
            {formError}
            {unverified && <button type="button" onClick={continueVerification} className="ml-1 font-bold underline underline-offset-2">Verify now</button>}
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          <div>
            <label htmlFor="login-email">Email address</label>
            <input id="login-email" name="email" type="email" value={form.email} onChange={updateField} autoComplete="email" className={`field-input ${errors.email ? "field-input-error" : ""}`} placeholder="you@example.com" />
            {errors.email && <p className="field-error">{errors.email}</p>}
          </div>
          <div>
            <PasswordField id="login-password" name="password" label="Password" value={form.password} onChange={updateField} autoComplete="current-password" error={errors.password} placeholder="Your password" />
            <div className="auth-form-link-right"><Link to="/forgot-password">Forgot password?</Link></div>
          </div>
          <button type="submit" disabled={isSubmitting} className="primary-button w-full sm:w-auto sm:min-w-48">
            {isSubmitting ? <><span className="button-spinner" />Signing in…</> : <>Sign in <span>→</span></>}
          </button>
        </form>

        <p className="auth-form-switch">New to Futurion? <Link to="/register">Create your account</Link></p>
      </div>
    </AuthLayout>
  );
}

export default LoginPage;
