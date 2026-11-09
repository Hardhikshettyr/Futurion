
const {
  createPasswordResetEmailTemplate,
  createVerificationEmailTemplate,
} = require("../utils/emailTemplates");

const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";
const EMAIL_TIMEOUT_MS = 15000;

function getEmailConfiguration() {
  const apiKey = process.env.BREVO_API_KEY?.trim();
  const fromValue = process.env.EMAIL_FROM?.trim();

  if (!apiKey) {
    throw new Error("BREVO_API_KEY is not configured");
  }

  if (!fromValue) {
    throw new Error("EMAIL_FROM is not configured");
  }

  const bracketedAddress = fromValue.match(/<([^>]+)>/);
  const fromAddress = (bracketedAddress?.[1] || fromValue).trim();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fromAddress)) {
    throw new Error("EMAIL_FROM must contain a valid sender email");
  }

  const senderName = bracketedAddress
    ? fromValue.split("<")[0].trim().replace(/^"|"$/g, "")
    : "Futurion";

  return {
    apiKey,
    sender: {
      name: senderName || "Futurion",
      email: fromAddress,
    },
  };
}

async function sendTemplatedEmail({
  recipientEmail,
  subject,
  template,
}) {
  const config = getEmailConfiguration();

  if (!recipientEmail || !recipientEmail.trim()) {
    throw new Error("Recipient email is required");
  }

  if (!template?.html || !template?.text) {
    throw new Error("Email template must contain HTML and text content");
  }

  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, EMAIL_TIMEOUT_MS);

  try {
    const response = await fetch(BREVO_API_URL, {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        "api-key": config.apiKey,
      },
      body: JSON.stringify({
        sender: config.sender,
        to: [
          {
            email: recipientEmail.trim(),
          },
        ],
        subject,
        htmlContent: template.html,
        textContent: template.text,
      }),
      signal: controller.signal,
    });

    const responseBody = await response.text();

    let result;

    try {
      result = responseBody ? JSON.parse(responseBody) : {};
    } catch {
      result = { message: responseBody };
    }

    if (!response.ok) {
      console.error("[EMAIL] Brevo API rejected the request:", {
        status: response.status,
        message: result.message || "Unknown Brevo API error",
        code: result.code,
      });

      const error = new Error(
        result.message || "Brevo email delivery request failed"
      );

      error.code = result.code || "BREVO_API_ERROR";
      error.status = response.status;

      throw error;
    }

    console.log("[EMAIL] Brevo accepted the email:", {
      messageId: result.messageId,
    });

    return result;
  } catch (error) {
    if (error.name === "AbortError") {
      console.error("[EMAIL] Brevo API request timed out");

      const timeoutError = new Error("Email delivery request timed out");
      timeoutError.name = "EmailDeliveryError";
      timeoutError.code = "BREVO_API_TIMEOUT";
      timeoutError.cause = error;

      throw timeoutError;
    }

    if (error.name === "EmailDeliveryError") {
      throw error;
    }

    console.error("[EMAIL] Delivery failed:", {
      message: error.message,
      code: error.code,
      status: error.status,
    });

    const deliveryError = new Error("Email delivery failed");
    deliveryError.name = "EmailDeliveryError";
    deliveryError.cause = error;

    throw deliveryError;
  } finally {
    clearTimeout(timeout);
  }
}

async function sendVerificationEmail(recipientEmail, otp) {
  return sendTemplatedEmail({
    recipientEmail,
    subject: "Your Futurion verification code",
    template: createVerificationEmailTemplate(otp),
  });
}

async function sendPasswordResetEmail(recipientEmail, otp) {
  return sendTemplatedEmail({
    recipientEmail,
    subject: "Reset your Futurion password",
    template: createPasswordResetEmailTemplate(otp),
  });
}

module.exports = {
  sendPasswordResetEmail,
  sendVerificationEmail,
};
