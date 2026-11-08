require("dotenv").config();

if (process.env.NODE_ENV === "production") {
  console.error("Test email delivery is disabled in production mode");
  process.exit(1);
}

const { sendVerificationEmail } = require("../src/services/emailService");
const { generateOtp } = require("../src/services/emailVerificationService");

const recipientEmail = process.argv[2];

if (!recipientEmail || !recipientEmail.includes("@")) {
  console.error(
    "Provide a test recipient: npm run email:test -- recipient@example.com",
  );
  process.exit(1);
}

sendVerificationEmail(recipientEmail, generateOtp())
  .then(() => {
    console.log("Test verification email was accepted by the SMTP server");
  })
  .catch(() => {
    console.error(
      "Test email delivery failed. Check the verified sender and Brevo SMTP configuration.",
    );
    process.exit(1);
  });
