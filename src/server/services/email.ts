import { env } from "@/server/env";

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export interface SentEmailRecord extends SendEmailOptions {
  from: string;
  sentAt: Date;
}

// In-memory record of sent emails for testing and development
export const _testSentEmails: SentEmailRecord[] = [];

export function clearSentEmails(): void {
  _testSentEmails.length = 0;
}

export function getSentEmails(): readonly SentEmailRecord[] {
  return _testSentEmails;
}

/**
 * Core sendEmail function.
 * Uses Resend REST API when RESEND_API_KEY is configured.
 * Falls back to in-memory/console logging in development and test environments.
 */
export async function sendEmail({
  to,
  subject,
  html,
  text,
}: SendEmailOptions): Promise<{ id: string; success: boolean }> {
  const from = env.EMAIL_FROM;

  if (env.RESEND_API_KEY) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject,
        html,
        text,
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error("[Email] Failed to send email via Resend:", errorText);
      throw new Error(`Failed to send email: ${res.status} ${res.statusText}`);
    }

    const data = (await res.json()) as { id: string };
    return { id: data.id, success: true };
  }

  // Development/Test mock provider
  const record: SentEmailRecord = {
    to,
    from,
    subject,
    html,
    text,
    sentAt: new Date(),
  };

  _testSentEmails.push(record);

  if (env.NODE_ENV !== "test") {
    console.info(`[Email Mock] Sent to: ${to} | Subject: ${subject}`);
  }

  return {
    id: `mock-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    success: true,
  };
}

/**
 * Send account email verification link.
 */
export async function sendVerificationEmail({
  to,
  name,
  verificationUrl,
}: {
  to: string;
  name?: string | null;
  verificationUrl: string;
}): Promise<{ id: string; success: boolean }> {
  const recipientName = name ? name.trim() : "there";
  const subject = "Verify your Tally account";

  const text = `Hello ${recipientName},

Welcome to Tally! Please verify your email address by opening the following link:

${verificationUrl}

This verification link will expire in 1 hour.

If you did not sign up for an account, please ignore this email.`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${subject}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f3f1e8; color: #17211b; margin: 0; padding: 24px; line-height: 1.6; }
    .container { max-width: 560px; margin: 0 auto; background-color: #ffffef; border-radius: 16px; border: 2px solid #ddd7c8; padding: 32px; }
    .brand { font-size: 22px; font-weight: 800; color: #17211b; margin-bottom: 8px; }
    .tagline { font-size: 12px; color: #5e8c61; font-weight: 600; margin-bottom: 24px; }
    .button { display: inline-block; background-color: #5e8c61; color: #ffffef !important; text-decoration: none; padding: 12px 28px; border-radius: 9999px; font-weight: 700; margin: 24px 0; }
    .footer { font-size: 13px; color: #5c665f; margin-top: 32px; border-top: 1px solid #ddd7c8; padding-top: 16px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="brand">Tally</div>
    <div class="tagline">Track it. Earn it. Grow it.</div>
    <p>Hello <strong>${recipientName}</strong>,</p>
    <p>Welcome! Please verify your email address to complete your account setup and start tracking your freelance finances.</p>
    <div>
      <a href="${verificationUrl}" class="button" target="_blank" rel="noopener noreferrer">Verify Email Address</a>
    </div>
    <p style="font-size: 14px; color: #5c665f;">Or copy and paste this link into your browser:<br><span style="word-break: break-all; color: #5e8c61;">${verificationUrl}</span></p>
    <div class="footer">
      <p>This verification link expires in 1 hour.<br>If you did not create an account, you can safely ignore this email.</p>
    </div>
  </div>
</body>
</html>`;

  return sendEmail({
    to,
    subject,
    html,
    text,
  });
}

/**
 * Send password reset link.
 */
export async function sendPasswordResetEmail({
  to,
  name,
  resetUrl,
}: {
  to: string;
  name?: string | null;
  resetUrl: string;
}): Promise<{ id: string; success: boolean }> {
  const recipientName = name ? name.trim() : "there";
  const subject = "Reset your Tally password";

  const text = `Hello ${recipientName},

We received a request to reset the password for your Tally account.

You can reset your password using the link below:
${resetUrl}

This link will expire in 1 hour.

If you did not request a password reset, please ignore this email. Your password will remain unchanged.`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${subject}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f3f1e8; color: #17211b; margin: 0; padding: 24px; line-height: 1.6; }
    .container { max-width: 560px; margin: 0 auto; background-color: #ffffef; border-radius: 16px; border: 2px solid #ddd7c8; padding: 32px; }
    .brand { font-size: 22px; font-weight: 800; color: #17211b; margin-bottom: 8px; }
    .tagline { font-size: 12px; color: #5e8c61; font-weight: 600; margin-bottom: 24px; }
    .button { display: inline-block; background-color: #5e8c61; color: #ffffef !important; text-decoration: none; padding: 12px 28px; border-radius: 9999px; font-weight: 700; margin: 24px 0; }
    .footer { font-size: 13px; color: #5c665f; margin-top: 32px; border-top: 1px solid #ddd7c8; padding-top: 16px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="brand">Tally</div>
    <div class="tagline">Track it. Earn it. Grow it.</div>
    <p>Hello <strong>${recipientName}</strong>,</p>
    <p>We received a request to reset your password. Click the button below to choose a new password:</p>
    <div>
      <a href="${resetUrl}" class="button" target="_blank" rel="noopener noreferrer">Reset Password</a>
    </div>
    <p style="font-size: 14px; color: #5c665f;">Or copy and paste this link into your browser:<br><span style="word-break: break-all; color: #5e8c61;">${resetUrl}</span></p>
    <div class="footer">
      <p>This password reset link expires in 1 hour.<br>If you did not request a password reset, please ignore this email. Your password will remain unchanged.</p>
    </div>
  </div>
</body>
</html>`;

  return sendEmail({
    to,
    subject,
    html,
    text,
  });
}
