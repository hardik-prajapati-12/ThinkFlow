// config/mailer.js — Nodemailer transporter
const nodemailer = require('nodemailer');

/**
 * Build a fresh transporter each time so .env changes are picked up
 * without restarting the server.
 */
function createTransporter() {
  return nodemailer.createTransport({
    host:    process.env.EMAIL_HOST  || 'smtp.gmail.com',
    port:    parseInt(process.env.EMAIL_PORT || '587'),
    secure:  process.env.EMAIL_SECURE === 'true',   // false for port 587
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });
}

// Verify on startup
createTransporter().verify((error) => {
  if (error) {
    console.warn('⚠  Email not configured:', error.message);
    console.warn('Set EMAIL_USER and EMAIL_PASS in backend/.env to enable emails.');
  } else {
    console.log('✅  Email transporter ready');
  }
});

/**
 * Send a reply email to a contact-form sender.
 */
async function sendReply({ to, toName, subject, body, originalMsg, originalTopic }) {
  const fromName  = process.env.EMAIL_FROM_NAME || 'BlogSite';
  const fromEmail = process.env.EMAIL_FROM      || process.env.EMAIL_USER;

  const textBody = `Hi ${toName},\n\n${body}\n\n──\nBest regards,\nThe BlogSite Team\n\n--- Your original message (${originalTopic}) ---\n${originalMsg}`;

  const htmlBody = `
<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#E8EAE0;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#E8EAE0;padding:36px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0"
             style="max-width:600px;width:100%;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 4px 28px rgba(30,70,45,0.10);">

        <!-- Header -->
        <tr>
          <td style="background:#1B3D2A;padding:28px 36px;">
            <table cellpadding="0" cellspacing="0"><tr>
              <td><span style="display:inline-block;width:10px;height:10px;background:#4CAF72;border-radius:50%;margin-right:8px;vertical-align:middle;"></span></td>
              <td><span style="font-family:Georgia,serif;font-size:22px;font-weight:700;color:#ffffff;vertical-align:middle;">BlogSite</span></td>
            </tr></table>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:36px 36px 0;">
            <p style="margin:0 0 8px;font-size:15px;color:#5A7A65;">
              Hello <strong style="color:#1B3D2A;">${toName}</strong>,
            </p>
            <div style="font-size:15px;color:#333;line-height:1.8;margin-top:16px;white-space:pre-wrap;">${body.replace(/\n/g, '<br>')}</div>
          </td>
        </tr>

        <!-- Divider -->
        <tr><td style="padding:28px 36px 0;"><hr style="border:none;border-top:1px solid #D6E4DA;"></td></tr>

        <!-- Signature -->
        <tr>
          <td style="padding:20px 36px 0;">
            <p style="margin:0;font-size:14px;color:#5A7A65;line-height:1.8;">
              Best regards,<br>
              <strong style="color:#1B3D2A;">${fromName}</strong><br>
              <a href="mailto:${fromEmail}" style="color:#2D6A4F;text-decoration:none;">${fromEmail}</a>
            </p>
          </td>
        </tr>

        <!-- Original Message Block -->
        <tr>
          <td style="padding:24px 36px 0;">
            <div style="background:#F2F5F0;border-left:3px solid #2D6A4F;padding:16px 20px;border-radius:0 8px 8px 0;">
              <p style="margin:0 0 6px;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#5A7A65;font-weight:600;">
                Your original message · ${originalTopic}
              </p>
              <p style="margin:0;font-size:13px;color:#4A6355;line-height:1.7;white-space:pre-wrap;">${originalMsg}</p>
            </div>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:28px 36px 32px;">
            <p style="margin:0;font-size:11px;color:#8AAA95;text-align:center;">
              This is a reply to your BlogSite contact form submission.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body></html>`;

  return createTransporter().sendMail({
    from:    `"${fromName}" <${fromEmail}>`,
    to:      `"${toName}" <${to}>`,
    subject: subject || `Re: Your message to ${fromName}`,
    text:    textBody,
    html:    htmlBody,
  });
}

/**
 * Send a 6-digit OTP for password reset.
 */
async function sendOTPEmail({ to, toName, otp }) {
  const fromName  = process.env.EMAIL_FROM_NAME || 'BlogSite';
  const fromEmail = process.env.EMAIL_FROM      || process.env.EMAIL_USER;

  return createTransporter().sendMail({
    from:    `"${fromName}" <${fromEmail}>`,
    to:      `"${toName}" <${to}>`,
    subject: `${otp} is your BlogSite password reset code`,
    text:    `Hi ${toName},\n\nYour BlogSite password reset code is:\n\n  ${otp}\n\nThis code expires in 10 minutes.\nIf you didn't request this, ignore this email.\n\n— BlogSite Team`,
    html: `
<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#E8EAE0;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#E8EAE0;padding:36px 0;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0"
             style="max-width:480px;width:100%;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 4px 28px rgba(30,70,45,0.10);">

        <!-- Header -->
        <tr>
          <td style="background:#1B3D2A;padding:22px 32px;">
            <table cellpadding="0" cellspacing="0"><tr>
              <td><span style="display:inline-block;width:10px;height:10px;background:#4CAF72;border-radius:50%;margin-right:8px;vertical-align:middle;"></span></td>
              <td><span style="font-family:Georgia,serif;font-size:20px;font-weight:700;color:#ffffff;vertical-align:middle;">BlogSite</span></td>
            </tr></table>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:32px 32px 16px;text-align:center;">
            <p style="font-size:15px;color:#333;margin:0 0 8px;">
              Hi <strong style="color:#1B3D2A;">${toName}</strong>, your password reset code is:
            </p>
            <p style="font-size:13px;color:#5A7A65;margin:0 0 28px;">
              Enter this code in the BlogSite app to reset your password.
            </p>
            <div style="background:#1B3D2A;border-radius:12px;padding:28px 0;margin:0 0 24px;">
              <span style="font-family:Georgia,serif;font-size:52px;font-weight:700;letter-spacing:18px;color:#4CAF72;">${otp}</span>
            </div>
            <p style="font-size:14px;color:#4A6355;margin:0 0 6px;">
              ⏱ This code expires in <strong>10 minutes</strong>.
            </p>
            <p style="font-size:13px;color:#8AAA95;margin:0;">
              If you didn't request this, you can safely ignore this email.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:16px 32px 28px;text-align:center;border-top:1px solid #D6E4DA;">
            <p style="font-size:11px;color:#8AAA95;margin:0;">
              Do not share this code with anyone. BlogSite will never ask for it.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body></html>`,
  });
}

module.exports = { sendReply, sendOTPEmail, createTransporter };