const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function passwordByteLength(password) {
  return new TextEncoder().encode(password).length;
}

function validateRegistration(values) {
  const errors = {};

  if (!values.name.trim()) errors.name = "Enter your full name";
  if (!EMAIL_PATTERN.test(values.email.trim())) errors.email = "Enter a valid email address";
  if (values.password.length < 8) errors.password = "Use at least 8 characters";
  else if (passwordByteLength(values.password) > 72) errors.password = "Password must not exceed 72 UTF-8 bytes";
  if (!values.confirmPassword) errors.confirmPassword = "Confirm your password";
  else if (values.password !== values.confirmPassword) errors.confirmPassword = "Passwords do not match";

  return errors;
}

export { EMAIL_PATTERN, validateRegistration };
