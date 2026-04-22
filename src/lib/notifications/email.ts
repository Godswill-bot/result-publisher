import nodemailer from "nodemailer";

import { env } from "../env";

export type EmailDispatchInput = {
  to: string;
  subject: string;
  text: string;
  html?: string;
  attachmentUrl?: string;
  attachmentName?: string;
};

export type EmailDispatchResult = {
  success: boolean;
  messageId?: string;
  mode: "smtp" | "console";
  error?: string;
};

function hasSmtpConfiguration() {
  return Boolean(env.emailHost && env.emailUser && env.emailPassword && env.emailFrom);
}

function createTransporter() {
  return nodemailer.createTransport({
    host: env.emailHost,
    port: env.emailPort,
    secure: env.emailPort === 465,
    auth: {
      user: env.emailUser,
      pass: env.emailPassword,
    },
  });
}

export async function sendEmailNotification({
  to,
  subject,
  text,
  html,
  attachmentUrl,
  attachmentName,
}: EmailDispatchInput): Promise<EmailDispatchResult> {
  console.log("[Email] Processing email request:", { to, subject, hasAttachment: !!attachmentUrl });

  if (!hasSmtpConfiguration()) {
    console.warn(
      "[Email:Console] SMTP not configured. Set EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASSWORD, EMAIL_FROM to enable real email sending.",
    );
    console.info("[Email:Console]", { to, subject, attachmentUrl });
    return {
      success: false,
      mode: "console",
      error: "Email SMTP not configured. Message logged to console.",
    };
  }

  try {
    console.log("[Email:SMTP] Connecting and sending...", { to, subject });
    const transporter = createTransporter();
    const info = await transporter.sendMail({
      from: env.emailFrom,
      to,
      subject,
      text,
      html,
      attachments: attachmentUrl
        ? [
            {
              filename: attachmentName ?? "result.pdf",
              path: attachmentUrl,
            },
          ]
        : undefined,
    });

    console.log("[Email:SMTP] Successfully sent to", to, "with messageId:", info.messageId);
    return { success: true, mode: "smtp", messageId: info.messageId };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Email delivery failed";
    console.error("[Email:SMTP] Failed to send to", to, ":", message);
    return { success: false, mode: "smtp", error: message };
  }
}
