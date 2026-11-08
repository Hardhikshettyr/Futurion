function getOtpHashSecret() {
  const secret = process.env.OTP_HASH_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error("OTP_HASH_SECRET must contain at least 32 characters");
  }

  return secret;
}

function validateVerificationConfiguration() {
  getOtpHashSecret();
}

module.exports = { getOtpHashSecret, validateVerificationConfiguration };
