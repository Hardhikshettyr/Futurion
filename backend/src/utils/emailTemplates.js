function createVerificationEmailTemplate(otp) {
  const text = [
    "Verify your Futurion email",
    "",
    `Your verification code is: ${otp}`,
    "",
    "This code expires in five minutes. Do not share it with anyone.",
    "If you did not create a Futurion account, you can ignore this email.",
  ].join("\n");

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Verify your Futurion email</title>
  </head>
  <body style="margin:0;background:#f3f5f2;color:#132c33;font-family:Arial,Helvetica,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">Your Futurion verification code expires in five minutes.</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f5f2;padding:32px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;border:1px solid #dbe2dd;">
            <tr>
              <td style="background:#123c3a;padding:26px 36px;color:#ffffff;">
                <div style="font-size:20px;font-weight:700;letter-spacing:0.08em;">FUTURION</div>
                <div style="margin-top:5px;font-size:12px;color:#b9d6cf;letter-spacing:0.08em;">CAREER INTELLIGENCE</div>
              </td>
            </tr>
            <tr>
              <td style="padding:40px 36px 18px;">
                <h1 style="margin:0;font-size:28px;line-height:1.25;color:#132c33;">Confirm your email address</h1>
                <p style="margin:18px 0 0;font-size:16px;line-height:1.65;color:#4f6468;">Use the code below to finish setting up your student account.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 36px 26px;">
                <div style="border-left:4px solid #e9794a;background:#f8f4ed;padding:24px;text-align:center;">
                  <div style="font-size:12px;font-weight:700;letter-spacing:0.14em;color:#6a7778;">VERIFICATION CODE</div>
                  <div style="margin-top:12px;font-family:'Courier New',monospace;font-size:38px;font-weight:700;letter-spacing:0.22em;color:#123c3a;">${otp}</div>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:0 36px 38px;">
                <p style="margin:0;font-size:15px;line-height:1.65;color:#4f6468;"><strong>This code expires in five minutes.</strong> Never share this code with anyone, including someone claiming to represent Futurion.</p>
                <p style="margin:18px 0 0;font-size:14px;line-height:1.6;color:#718083;">If you did not create a Futurion account, no action is required.</p>
              </td>
            </tr>
            <tr>
              <td style="border-top:1px solid #e3e8e4;padding:20px 36px;font-size:12px;color:#7b898a;">Futurion · Build your path with clarity</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return { html, text };
}

function createPasswordResetEmailTemplate(otp) {
  const text = [
    "Reset your Futurion password",
    "",
    `Your password reset code is: ${otp}`,
    "",
    "This code expires in ten minutes. Do not share it with anyone.",
    "If you did not request a password reset, you can ignore this email.",
  ].join("\n");

  const html = `<!doctype html>
<html lang="en">
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Reset your Futurion password</title></head>
  <body style="margin:0;background:#f3f5f2;color:#132c33;font-family:Arial,Helvetica,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">Your Futurion password reset code expires in ten minutes.</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f5f2;padding:32px 12px;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;border:1px solid #dbe2dd;">
          <tr><td style="background:#123c3a;padding:26px 36px;color:#ffffff;"><div style="font-size:20px;font-weight:700;letter-spacing:.08em;">FUTURION</div><div style="margin-top:5px;font-size:12px;color:#b9d6cf;letter-spacing:.08em;">ACCOUNT SECURITY</div></td></tr>
          <tr><td style="padding:40px 36px 18px;"><h1 style="margin:0;font-size:28px;line-height:1.25;color:#132c33;">Reset your password</h1><p style="margin:18px 0 0;font-size:16px;line-height:1.65;color:#4f6468;">Use this one-time code to choose a new password for your Futurion account.</p></td></tr>
          <tr><td style="padding:8px 36px 26px;"><div style="border-left:4px solid #e9794a;background:#f8f4ed;padding:24px;text-align:center;"><div style="font-size:12px;font-weight:700;letter-spacing:.14em;color:#6a7778;">PASSWORD RESET CODE</div><div style="margin-top:12px;font-family:'Courier New',monospace;font-size:38px;font-weight:700;letter-spacing:.22em;color:#123c3a;">${otp}</div></div></td></tr>
          <tr><td style="padding:0 36px 38px;"><p style="margin:0;font-size:15px;line-height:1.65;color:#4f6468;"><strong>This code expires in ten minutes.</strong> Never share it with anyone. Futurion will never ask for this code outside the password reset screen.</p><p style="margin:18px 0 0;font-size:14px;line-height:1.6;color:#718083;">If you did not request this change, you can safely ignore this email.</p></td></tr>
          <tr><td style="border-top:1px solid #e3e8e4;padding:20px 36px;font-size:12px;color:#7b898a;">Futurion · Account security</td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;

  return { html, text };
}

module.exports = {
  createPasswordResetEmailTemplate,
  createVerificationEmailTemplate,
};
