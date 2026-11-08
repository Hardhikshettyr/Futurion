const { mailerFrom, transporter } = require("../config/mailer");
const {
  createPasswordResetEmailTemplate,
  createVerificationEmailTemplate,
} = require("../utils/emailTemplates");

async function sendTemplatedEmail({ recipientEmail, subject, template }) {
  try {
    return await transporter.sendMail({
      from: mailerFrom,
      to: recipientEmail,
      subject,
      text: template.text,
      html: template.html,
    });
  } catch (error) {
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

module.exports = { sendPasswordResetEmail, sendVerificationEmail };
