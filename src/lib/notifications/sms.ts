import { env } from "../env";

export type SmsDispatchInput = {
  to: string;
  message: string;
};

export type SmsDispatchResult = {
  success: boolean;
  mode: "termii" | "twilio" | "console";
  error?: string;
};

async function sendViaTermii(to: string, message: string) {
  if (!env.termiiApiKey) {
    return { success: false, mode: "termii" as const, error: "TERMII_API_KEY is missing" };
  }

  const response = await fetch(new URL(env.termiiSmsEndpoint, env.termiiBaseUrl), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      api_key: env.termiiApiKey,
      from: env.termiiSenderId,
      to,
      sms: message,
      type: "plain",
      channel: "generic",
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    return { success: false, mode: "termii" as const, error: body || `Termii SMS failed with ${response.status}` };
  }

  return { success: true, mode: "termii" as const };
}

async function sendViaTwilio(to: string, message: string) {
  if (!env.twilioAccountSid || !env.twilioAuthToken || !env.twilioSmsFrom) {
    return { success: false, mode: "twilio" as const, error: "Twilio SMS environment variables are missing" };
  }

  const body = new URLSearchParams({
    From: env.twilioSmsFrom,
    To: to,
    Body: message,
  });

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${env.twilioAccountSid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${env.twilioAccountSid}:${env.twilioAuthToken}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    },
  );

  if (!response.ok) {
    const text = await response.text();
    return { success: false, mode: "twilio" as const, error: text || `Twilio SMS failed with ${response.status}` };
  }

  return { success: true, mode: "twilio" as const };
}

export async function sendSmsNotification({ to, message }: SmsDispatchInput): Promise<SmsDispatchResult> {
  if (env.messagingProvider === "console" || (!env.termiiApiKey && !env.twilioAccountSid)) {
    console.info("[sms:console]", { to, message });
    return { success: true, mode: "console" };
  }

  if (env.messagingProvider === "twilio") {
    return sendViaTwilio(to, message);
  }

  return sendViaTermii(to, message);
}
