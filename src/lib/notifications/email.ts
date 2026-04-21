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
  if (!hasSmtpConfiguration()) {
    console.info("[email:console]", { to, subject, attachmentUrl });
    return { success: true, mode: "console" };
  }

  try {
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

    return { success: true, mode: "smtp", messageId: info.messageId };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Email delivery failed";
    return { success: false, mode: "smtp", error: message };
  }
}
