require("dotenv").config();

if (process.env.NODE_ENV === "production") {
  console.error("SMTP verification is disabled in production mode");
  process.exit(1);
}

const { verifySmtpConnection } = require("../src/config/mailer");

verifySmtpConnection()
  .then(() => {
    console.log("SMTP connection and authentication verified successfully");
  })
  .catch(() => {
    console.error(
      "SMTP verification failed. Check the configured host, port, credentials, and network access.",
    );
    process.exit(1);
  });
