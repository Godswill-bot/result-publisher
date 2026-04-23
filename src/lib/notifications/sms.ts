import { env } from "../env";

export type SmsDispatchInput = {
  to: string;
  message: string;
};

export type SmsDispatchResult = {
  success: boolean;
  mode: "twilio" | "console" | "skipped";
  error?: string;
};

function validatePhoneNumber(phone: string): boolean {
  // Basic validation: remove common formatting and check length
  const cleaned = phone.replace(/\D/g, "");
  return cleaned.length >= 10;
}

function normalizeTwilioPhoneNumber(phone: string): string {
  const trimmed = phone.trim();

  if (trimmed.startsWith("whatsapp:")) {
    return trimmed;
  }

  const cleaned = trimmed.replace(/[\s()-]/g, "");

  if (cleaned.startsWith("+")) {
    return cleaned;
  }

  if (cleaned.startsWith("234") && cleaned.length >= 13) {
    return `+${cleaned}`;
  }

  if (cleaned.startsWith("0") && cleaned.length >= 11) {
    return `+234${cleaned.slice(1)}`;
  }

  if (/^\d{10,15}$/.test(cleaned)) {
    return `+${cleaned}`;
  }

  return cleaned;
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
    const fromNumber = env.twilioSmsFrom.replace(/\s+/g, "");
    const toNumber = normalizeTwilioPhoneNumber(to);
    const body = new URLSearchParams({
      From: fromNumber,
      To: toNumber,
      Body: message,
    });

    console.log("[SMS:Twilio] Sending to:", toNumber);

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
      const isTrialAccountUnverifiedRecipient =
        response.status === 400 &&
        (text.includes("21608") || text.toLowerCase().includes("unverified"));

      if (isTrialAccountUnverifiedRecipient) {
        const skipReason = `Twilio trial account skipped unverified recipient ${toNumber}`;
        console.warn("[SMS:Twilio]", skipReason, text);
        return { success: true, mode: "skipped" as const };
      }

      const error = `Twilio SMS failed with status ${response.status}: ${text}`;
      console.error("[SMS:Twilio]", error);
      return { success: false, mode: "twilio" as const, error };
    }

    console.log("[SMS:Twilio] Successfully sent to", toNumber);
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
  if (!env.twilioAccountSid || !env.twilioAuthToken || !env.twilioSmsFrom) {
    console.warn(
      "[SMS:Console] No Twilio SMS credentials configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_SMS_FROM to enable real SMS sending.",
    );
    console.info("[SMS:Console]", { to, message });
    return {
      success: false,
      mode: "console",
      error: "SMS credentials not configured. Message logged to console.",
    };
  }

  return sendViaTwilio(to, message);
}
