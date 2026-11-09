
const { mailerFrom, transporter } = require("../config/mailer");

const {
  createPasswordResetEmailTemplate,
  createVerificationEmailTemplate,
} = require("../utils/emailTemplates");

async function sendTemplatedEmail({
  recipientEmail,
  subject,
  template,
}) {
  try {
    const info = await transporter.sendMail({
      from: mailerFrom,
      to: recipientEmail,
      subject,
      text: template.text,
      html: template.html,
    });

    console.log("[EMAIL] Message submitted to SMTP:", {
      messageId: info.messageId,
      acceptedCount: info.accepted?.length || 0,
      rejectedCount: info.rejected?.length || 0,
    });

    if (!info.accepted || info.accepted.length === 0) {
      const error = new Error(
        "SMTP provider did not accept the recipient"
      );
      error.code = "EMAIL_RECIPIENT_REJECTED";
      throw error;
    }

    return info;
  } catch (error) {
    // Log the original Nodemailer error before wrapping it.
    console.error("[EMAIL] SMTP delivery failed:", {
      message: error.message,
      code: error.code,
      command: error.command,
      responseCode: error.responseCode,
      response: error.response,
    });

    const deliveryError = new Error("Email delivery failed");
    deliveryError.name = "EmailDeliveryError";
    deliveryError.cause = error;

    throw deliveryError;
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
