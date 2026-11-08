const nodemailer = require("nodemailer");

const REQUIRED_EMAIL_ENVIRONMENT_VARIABLES = [
  "SMTP_HOST",
  "SMTP_PORT",
  "SMTP_USER",
  "SMTP_PASS",
  "EMAIL_FROM",
];

function readMailerConfiguration() {
  const missingVariables = REQUIRED_EMAIL_ENVIRONMENT_VARIABLES.filter(
    (variableName) => !process.env[variableName]?.trim(),
  );

  if (missingVariables.length > 0) {
    throw new Error(
      `Missing required email configuration: ${missingVariables.join(", ")}`,
    );
  }

  const port = Number(process.env.SMTP_PORT);

  if (port !== 587) {
    throw new Error("SMTP_PORT must be 587 for the Brevo STARTTLS transport");
  }

  const fromValue = process.env.EMAIL_FROM.trim();
  const bracketedAddress = fromValue.match(/<([^>]+)>/);
  const fromAddress = (bracketedAddress?.[1] || fromValue).trim();

  if (!fromAddress.includes("@")) {
    throw new Error("EMAIL_FROM must contain a valid verified sender address");
  }

  return {
    host: process.env.SMTP_HOST.trim(),
    port,
    user: process.env.SMTP_USER.trim(),
    pass: process.env.SMTP_PASS,
    from: {
      name: "Futurion",
      address: fromAddress,
    },
  };
}

const mailerConfiguration = readMailerConfiguration();

const transporter = nodemailer.createTransport({
  host: mailerConfiguration.host,
  port: mailerConfiguration.port,
  secure: false,
  requireTLS: true,
  auth: {
    user: mailerConfiguration.user,
    pass: mailerConfiguration.pass,
  },
  tls: {
    minVersion: "TLSv1.2",
    rejectUnauthorized: true,
  },
});

async function verifySmtpConnection() {
  return transporter.verify();
}

module.exports = {
  mailerFrom: mailerConfiguration.from,
  transporter,
  verifySmtpConnection,
};
