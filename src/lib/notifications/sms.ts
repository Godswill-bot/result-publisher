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

function validatePhoneNumber(phone: string): boolean {
  // Basic validation: remove common formatting and check length
  const cleaned = phone.replace(/\D/g, "");
  return cleaned.length >= 10;
}

async function sendViaTermii(to: string, message: string) {
  if (!env.termiiApiKey) {
    const error = "TERMII_API_KEY is missing - SMS cannot be sent";
    console.error("[SMS:Termii]", error);
    return { success: false, mode: "termii" as const, error };
  }

  if (!env.termiiSenderId) {
    const error = "TERMII_SENDER_ID is missing - SMS cannot be sent";
    console.error("[SMS:Termii]", error);
    return { success: false, mode: "termii" as const, error };
  }

  if (!validatePhoneNumber(to)) {
    const error = `Invalid phone number format: ${to}`;
    console.error("[SMS:Termii]", error);
    return { success: false, mode: "termii" as const, error };
  }

  try {
    const url = new URL(env.termiiSmsEndpoint, env.termiiBaseUrl).toString();
    console.log("[SMS:Termii] Sending to:", { to, url });

    const response = await fetch(url, {
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

    const responseText = await response.text();

    if (!response.ok) {
      const error = `Termii SMS failed with status ${response.status}: ${responseText}`;
      console.error("[SMS:Termii]", error);
      return { success: false, mode: "termii" as const, error };
    }

    console.log("[SMS:Termii] Successfully sent to", to);
    return { success: true, mode: "termii" as const };
  } catch (err) {
    const error = err instanceof Error ? err.message : "Unknown error";
    console.error("[SMS:Termii] Exception:", error);
    return { success: false, mode: "termii" as const, error };
  }
}

async function sendViaTwilio(to: string, message: string) {
  if (!env.twilioAccountSid || !env.twilioAuthToken || !env.twilioSmsFrom) {
    const error = "Twilio SMS environment variables are missing";
    console.error("[SMS:Twilio]", error);
    return { success: false, mode: "twilio" as const, error };
  }

  if (!validatePhoneNumber(to)) {
    const error = `Invalid phone number format: ${to}`;
    console.error("[SMS:Twilio]", error);
    return { success: false, mode: "twilio" as const, error };
  }

  try {
    const body = new URLSearchParams({
      From: env.twilioSmsFrom,
      To: to,
      Body: message,
    });

    console.log("[SMS:Twilio] Sending to:", to);

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

    const text = await response.text();

    if (!response.ok) {
      const error = `Twilio SMS failed with status ${response.status}: ${text}`;
      console.error("[SMS:Twilio]", error);
      return { success: false, mode: "twilio" as const, error };
    }

    console.log("[SMS:Twilio] Successfully sent to", to);
    return { success: true, mode: "twilio" as const };
  } catch (err) {
    const error = err instanceof Error ? err.message : "Unknown error";
    console.error("[SMS:Twilio] Exception:", error);
    return { success: false, mode: "twilio" as const, error };
  }
}

export async function sendSmsNotification({ to, message }: SmsDispatchInput): Promise<SmsDispatchResult> {
  console.log("[SMS] Processing SMS request:", { to, messageLength: message.length });

  // Check if we have any credentials configured
  if (!env.termiiApiKey && !env.twilioAccountSid) {
    console.warn(
      "[SMS:Console] No SMS credentials configured. Set TERMII_API_KEY or TWILIO_ACCOUNT_SID to enable real SMS sending.",
    );
    console.info("[SMS:Console]", { to, message });
    return {
      success: false,
      mode: "console",
      error: "SMS credentials not configured. Message logged to console.",
    };
  }

  if (env.messagingProvider === "twilio") {
    return sendViaTwilio(to, message);
  }

  return sendViaTermii(to, message);
}
