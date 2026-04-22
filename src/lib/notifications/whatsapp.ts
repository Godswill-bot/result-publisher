import { env } from "../env";

export type WhatsAppDispatchInput = {
  to: string;
  message: string;
};

export type WhatsAppDispatchResult = {
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
    const error = "TERMII_API_KEY is missing - WhatsApp cannot be sent";
    console.error("[WhatsApp:Termii]", error);
    return { success: false, mode: "termii" as const, error };
  }

  if (!env.termiiSenderId) {
    const error = "TERMII_SENDER_ID is missing - WhatsApp cannot be sent";
    console.error("[WhatsApp:Termii]", error);
    return { success: false, mode: "termii" as const, error };
  }

  if (!validatePhoneNumber(to)) {
    const error = `Invalid phone number format: ${to}`;
    console.error("[WhatsApp:Termii]", error);
    return { success: false, mode: "termii" as const, error };
  }

  try {
    const url = new URL(env.termiiWhatsappEndpoint, env.termiiBaseUrl).toString();
    console.log("[WhatsApp:Termii] Sending to:", { to, url });

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
        message: message,
        type: "plain",
      }),
    });

    const responseText = await response.text();

    if (!response.ok) {
      const error = `Termii WhatsApp failed with status ${response.status}: ${responseText}`;
      console.error("[WhatsApp:Termii]", error);
      return { success: false, mode: "termii" as const, error };
    }

    console.log("[WhatsApp:Termii] Successfully sent to", to);
    return { success: true, mode: "termii" as const };
  } catch (err) {
    const error = err instanceof Error ? err.message : "Unknown error";
    console.error("[WhatsApp:Termii] Exception:", error);
    return { success: false, mode: "termii" as const, error };
  }
}

async function sendViaTwilio(to: string, message: string) {
  if (!env.twilioAccountSid || !env.twilioAuthToken || !env.twilioWhatsappFrom) {
    const error = "Twilio WhatsApp environment variables are missing";
    console.error("[WhatsApp:Twilio]", error);
    return { success: false, mode: "twilio" as const, error };
  }

  if (!validatePhoneNumber(to)) {
    const error = `Invalid phone number format: ${to}`;
    console.error("[WhatsApp:Twilio]", error);
    return { success: false, mode: "twilio" as const, error };
  }

  try {
    const whatsappNumber = `whatsapp:${to.replace(/^whatsapp:/i, "")}`;

    const body = new URLSearchParams({
      From: env.twilioWhatsappFrom,
      To: whatsappNumber,
      Body: message,
    });

    console.log("[WhatsApp:Twilio] Sending to:", whatsappNumber);

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
      const error = `Twilio WhatsApp failed with status ${response.status}: ${text}`;
      console.error("[WhatsApp:Twilio]", error);
      return { success: false, mode: "twilio" as const, error };
    }

    console.log("[WhatsApp:Twilio] Successfully sent to", whatsappNumber);
    return { success: true, mode: "twilio" as const };
  } catch (err) {
    const error = err instanceof Error ? err.message : "Unknown error";
    console.error("[WhatsApp:Twilio] Exception:", error);
    return { success: false, mode: "twilio" as const, error };
  }
}

export async function sendWhatsAppNotification({ to, message }: WhatsAppDispatchInput): Promise<WhatsAppDispatchResult> {
  console.log("[WhatsApp] Processing WhatsApp request:", { to, messageLength: message.length });

  // Check if we have any credentials configured
  if (!env.termiiApiKey && !env.twilioAccountSid) {
    console.warn(
      "[WhatsApp:Console] No WhatsApp credentials configured. Set TERMII_API_KEY or TWILIO_ACCOUNT_SID to enable real WhatsApp sending.",
    );
    console.info("[WhatsApp:Console]", { to, message });
    return {
      success: false,
      mode: "console",
      error: "WhatsApp credentials not configured. Message logged to console.",
    };
  }

  if (env.messagingProvider === "twilio") {
    return sendViaTwilio(to, message);
  }

  return sendViaTermii(to, message);
}
