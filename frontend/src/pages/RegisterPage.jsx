import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import PasswordField from "../components/PasswordField.jsx";
import PasswordStrength from "../components/PasswordStrength.jsx";
import AuthLayout from "../layouts/AuthLayout.jsx";
import { registerStudent } from "../services/authApi.js";
import { validateRegistration } from "../utils/authValidation.js";
import { saveVerificationSession } from "../utils/verificationSession.js";

const INITIAL_FORM = {
  name: "",
  email: "",
  password: "",
  confirmPassword: "",
};

function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: "" }));
    setFormError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (isSubmitting) return;

    const nextErrors = validateRegistration(form);
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setIsSubmitting(true);
    setFormError("");

    try {
      const result = await registerStudent(form);
      const email = result.user.email;
      const cooldown = result.verification?.resendCooldownSeconds || 0;
      saveVerificationSession(email, cooldown);
      navigate("/verify-email", {
        state: {
          email,
          deliveryFailed: !result.verification?.emailSent,
        },
      });
    } catch (error) {
      const serverErrors = error.payload?.errors;
      if (Array.isArray(serverErrors)) {
        setErrors(
          Object.fromEntries(serverErrors.map((item) => [item.field, item.message])),
        );
      }
      setFormError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthLayout activeStep={1} variant="register">
      <div className="auth-form-content"><div className="auth-form-heading"><p className="auth-eyebrow">Student account</p><h2>Start with what makes you, <em>you.</em></h2><p className="auth-form-intro">Create your account now. Your academic story and career goals come next.</p></div>

      {formError && (
        <div role="alert" className="auth-form-alert">
          {formError}
          {formError.toLowerCase().includes("already exists") && (
            <Link to="/verify-email" className="ml-1 font-bold underline underline-offset-2">Verify that account</Link>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="auth-form">
        <div>
          <label htmlFor="name">Full name</label>
          <input id="name" name="name" value={form.name} onChange={updateField} autoComplete="name" placeholder="Your full name" aria-invalid={Boolean(errors.name)} className={`field-input ${errors.name ? "field-input-error" : ""}`} />
          {errors.name && <p className="field-error">{errors.name}</p>}
        </div>

        <div>
          <label htmlFor="email">Email address</label>
          <input id="email" name="email" value={form.email} onChange={updateField} type="email" autoComplete="email" placeholder="you@example.com" aria-invalid={Boolean(errors.email)} className={`field-input ${errors.email ? "field-input-error" : ""}`} />
          {errors.email && <p className="field-error">{errors.email}</p>}
        </div>

        <div className="auth-form-grid">
          <div>
            <PasswordField id="password" name="password" label="Password" value={form.password} onChange={updateField} autoComplete="new-password" placeholder="At least 8 characters" error={errors.password} />
            <PasswordStrength password={form.password} />
          </div>
          <PasswordField id="confirmPassword" name="confirmPassword" label="Confirm password" value={form.confirmPassword} onChange={updateField} autoComplete="new-password" placeholder="Repeat your password" error={errors.confirmPassword} />
        </div>

        <button type="submit" disabled={isSubmitting} className="primary-button mt-2 w-full sm:w-auto sm:min-w-56">
          {isSubmitting ? <><span className="button-spinner" aria-hidden="true" />Creating your account…</> : <>Create student account <span aria-hidden="true">→</span></>}
        </button>
      </form>

      <p className="auth-form-switch">Already have an account? <Link to="/login">Sign in</Link></p>
      <p className="auth-form-terms">By continuing, you agree to use Futurion responsibly and provide accurate information about your education and experience.</p></div>
    </AuthLayout>
  );
}

export default RegisterPage;
