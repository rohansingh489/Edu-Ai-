import nodemailer from "nodemailer";

/**
 * Communications Service for EduConnect AI
 * Handles real-time email dispatch and SMS dispatch to actual emails and phone numbers.
 */

interface WelcomeEmailParams {
  to: string;
  name: string;
  role: "STUDENT" | "TEACHER" | "ADMIN";
  loginId: string;
  password?: string;
  portalUrl?: string;
}

interface NotificationEmailParams {
  to: string;
  name: string;
  title: string;
  body: string;
  link?: string;
}

interface PasswordResetEmailParams {
  to: string;
  name: string;
  newPassword: string;
  portalUrl?: string;
}

interface SMSParams {
  phone: string;
  name: string;
  message: string;
}

function getMailTransporter() {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || "587", 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const secure = process.env.SMTP_SECURE === "true" || port === 465;

  if (!host || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    tls: { rejectUnauthorized: false },
  });
}

function getFromAddress() {
  return process.env.SMTP_FROM || `"EduConnect AI" <${process.env.SMTP_USER || "notifications@educonnect.edu"}>`;
}

/**
 * Sends a real email using configured SMTP or logs for tracking
 */
export async function sendEmail({
  to,
  subject,
  html,
  text,
}: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const transporter = getMailTransporter();
    if (!transporter) {
      console.log(`\n==================================================`);
      console.log(`[REAL-TIME EMAIL DISPATCH] (Simulated - set SMTP in .env for external relay)`);
      console.log(`TO: ${to}`);
      console.log(`SUBJECT: ${subject}`);
      console.log(`CONTENT PREVIEW: ${text || html.slice(0, 150)}...`);
      console.log(`==================================================\n`);
      return { success: true, messageId: `mock-${Date.now()}` };
    }

    const info = await transporter.sendMail({
      from: getFromAddress(),
      to,
      subject,
      text: text || html.replace(/<[^>]+>/g, " "),
      html,
    });

    console.log(`[EMAIL SENT VIA SMTP] Message ID: ${info.messageId} to ${to}`);
    return { success: true, messageId: info.messageId };
  } catch (err: any) {
    console.error(`[EMAIL ERROR] Failed to send to ${to}:`, err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Sends a real SMS via Twilio, Fast2SMS, or HTTP Webhook API
 */
export async function sendSMS({
  phone,
  name,
  message,
}: SMSParams): Promise<{ success: boolean; error?: string }> {
  try {
    const cleanPhone = phone.replace(/[^\d+]/g, "");
    if (!cleanPhone) {
      return { success: false, error: "Invalid phone number" };
    }

    // 1. Fast2SMS (popular Indian SMS gateway)
    const fast2smsKey = process.env.FAST2SMS_API_KEY;
    if (fast2smsKey) {
      const res = await fetch("https://www.fast2sms.com/dev/bulkV2", {
        method: "POST",
        headers: {
          authorization: fast2smsKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          route: "v3",
          sender_id: "TXTIND",
          message: `${message}\n- EduConnect AI`,
          numbers: cleanPhone.replace("+91", "").replace("+", ""),
        }),
      });
      const data = await res.json();
      console.log(`[SMS FAST2SMS] Result for ${cleanPhone}:`, data);
      return { success: data.return === true };
    }

    // 2. Twilio SMS
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioFrom = process.env.TWILIO_PHONE_NUMBER;

    if (accountSid && authToken && twilioFrom) {
      const authHeader = "Basic " + Buffer.from(`${accountSid}:${authToken}`).toString("base64");
      const body = new URLSearchParams({
        To: cleanPhone.startsWith("+") ? cleanPhone : `+91${cleanPhone}`,
        From: twilioFrom,
        Body: `${message}\n- EduConnect AI`,
      });

      const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
        method: "POST",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: body.toString(),
      });

      const data = await res.json();
      if (!res.ok) {
        console.error(`[SMS TWILIO ERROR]`, data);
        return { success: false, error: data.message };
      }
      console.log(`[SMS SENT VIA TWILIO] To ${cleanPhone}, SID: ${data.sid}`);
      return { success: true };
    }

    // Fallback: Log SMS dispatch
    console.log(`\n==================================================`);
    console.log(`[REAL-TIME SMS DISPATCH]`);
    console.log(`TO: ${cleanPhone} (${name})`);
    console.log(`MESSAGE: ${message}`);
    console.log(`(Configure TWILIO_ACCOUNT_SID or FAST2SMS_API_KEY in .env for real SMS transmission)`);
    console.log(`==================================================\n`);
    return { success: true };
  } catch (err: any) {
    console.error(`[SMS ERROR] Failed to send SMS to ${phone}:`, err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Sends a welcome email with credentials to newly created student or teacher
 */
export async function sendWelcomeEmail({
  to,
  name,
  role,
  loginId,
  password,
  portalUrl,
}: WelcomeEmailParams) {
  const roleTitle = role === "TEACHER" ? "Faculty" : role === "STUDENT" ? "Student" : "Administrator";
  const defaultPortal = role === "TEACHER" ? "/login/teacher" : role === "STUDENT" ? "/login/student" : "/login/admin";
  const loginUrl = portalUrl || `http://localhost:3000${defaultPortal}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; color: #1e293b; margin: 0; padding: 24px; }
        .card { max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
        .header { background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%); color: #ffffff; padding: 32px 24px; text-align: center; }
        .logo { font-size: 24px; font-weight: 800; letter-spacing: -0.5px; }
        .content { padding: 32px 24px; }
        .cred-box { background: #f1f5f9; border-radius: 12px; border: 1px solid #cbd5e1; padding: 20px; margin: 24px 0; }
        .cred-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0; }
        .cred-row:last-child { border-bottom: none; }
        .label { font-size: 13px; font-weight: 600; color: #64748b; text-transform: uppercase; }
        .val { font-size: 14px; font-weight: 700; color: #0f172a; font-family: monospace; }
        .btn { display: inline-block; background: #2563eb; color: #ffffff !important; font-weight: 700; padding: 12px 28px; border-radius: 10px; text-decoration: none; margin-top: 16px; }
        .footer { padding: 20px 24px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <div class="logo">EduConnect AI</div>
          <p style="margin: 8px 0 0 0; opacity: 0.85; font-size: 14px;">Welcome to your Campus Portal</p>
        </div>
        <div class="content">
          <h2 style="margin-top: 0; color: #0f172a;">Welcome, ${name}!</h2>
          <p>Your <strong>${roleTitle} account</strong> has been created. You can now log in to access your dashboard, attendance, classes, assignments, and AI study tools.</p>
          
          <div class="cred-box">
            <div style="font-size: 12px; font-weight: 700; color: #475569; margin-bottom: 12px; text-transform: uppercase;">Your Login Credentials</div>
            <div class="cred-row">
              <span class="label">Portal ID</span>
              <span class="val">${loginId}</span>
            </div>
            <div class="cred-row">
              <span class="label">Registered Email</span>
              <span class="val">${to}</span>
            </div>
            ${password ? `
            <div class="cred-row">
              <span class="label">Password</span>
              <span class="val">${password}</span>
            </div>
            ` : ""}
          </div>

          <p style="font-size: 13px; color: #64748b;">You can log in using either your <strong>Portal ID (${loginId})</strong> or your <strong>Email address</strong>.</p>

          <center>
            <a href="${loginUrl}" class="btn">Log In to Portal</a>
          </center>
        </div>
        <div class="footer">
          © EduConnect AI Campus Management System · Please keep your login credentials secure.
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to,
    subject: `Welcome to EduConnect AI - Your ${roleTitle} Account Credentials`,
    html,
  });
}

/**
 * Sends a password reset notification email
 */
export async function sendPasswordResetEmail({
  to,
  name,
  newPassword,
  portalUrl,
}: PasswordResetEmailParams) {
  const loginUrl = portalUrl || "http://localhost:3000/login";

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; color: #1e293b; padding: 24px; }
        .card { max-width: 540px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; padding: 32px 24px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
        .btn { display: inline-block; background: #2563eb; color: #ffffff !important; font-weight: 700; padding: 12px 24px; border-radius: 10px; text-decoration: none; margin-top: 16px; }
      </style>
    </head>
    <body>
      <div class="card">
        <h2 style="color: #0f172a; margin-top: 0;">Password Reset Notification</h2>
        <p>Hello ${name},</p>
        <p>Your EduConnect AI account password has been updated by the administrator.</p>
        <div style="background: #f1f5f9; padding: 16px; border-radius: 10px; margin: 20px 0;">
          <p style="margin: 0; font-size: 13px; color: #64748b;">Your new temporary password:</p>
          <p style="margin: 6px 0 0 0; font-size: 18px; font-weight: 800; font-family: monospace; color: #0f172a;">${newPassword}</p>
        </div>
        <p>Please log in and update your password from your Settings page.</p>
        <center>
          <a href="${loginUrl}" class="btn">Go to Login</a>
        </center>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to,
    subject: "EduConnect AI - Your Password Has Been Reset",
    html,
  });
}

/**
 * Sends real notification email (announcements, exams, complaints)
 */
export async function sendNotificationEmail({
  to,
  name,
  title,
  body,
  link,
}: NotificationEmailParams) {
  const fullLink = link ? `http://localhost:3000${link}` : "http://localhost:3000";

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; color: #1e293b; padding: 24px; }
        .card { max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; }
        .header { background: #0f172a; color: #ffffff; padding: 20px 24px; }
        .content { padding: 28px 24px; }
        .btn { display: inline-block; background: #2563eb; color: #ffffff !important; font-weight: 700; padding: 10px 20px; border-radius: 8px; text-decoration: none; margin-top: 20px; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <strong style="font-size: 18px;">EduConnect AI Notification</strong>
        </div>
        <div class="content">
          <p>Hello ${name},</p>
          <h3 style="color: #0f172a; margin-top: 16px;">${title}</h3>
          <p style="color: #475569; line-height: 1.6;">${body}</p>
          ${link ? `<a href="${fullLink}" class="btn">View in Portal</a>` : ""}
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to,
    subject: `[EduConnect AI] ${title}`,
    html,
  });
}

