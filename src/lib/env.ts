export function requireEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function getEnv(name: string): string {
  const value = process.env[name];
  return value?.trim() ?? "";
}

function getEnvBoolean(name: string, defaultValue: boolean): boolean {
  const value = getEnv(name).toLowerCase();

  if (!value) {
    return defaultValue;
  }

  if (["1", "true", "yes", "on"].includes(value)) {
    return true;
  }

  if (["0", "false", "no", "off"].includes(value)) {
    return false;
  }

  return defaultValue;
}

export const env = {
  supabaseUrl: getEnv("NEXT_PUBLIC_SUPABASE_URL"),
  supabaseAnonKey: getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  supabaseServiceRoleKey: getEnv("SUPABASE_SERVICE_ROLE_KEY"),
  supabaseStorageBucket: getEnv("SUPABASE_STORAGE_BUCKET") || "student-results",
  adminSessionSecret: getEnv("ADMIN_SESSION_SECRET"),
  emailFrom: getEnv("EMAIL_FROM"),
  emailHost: getEnv("EMAIL_HOST"),
  emailPort: Number(getEnv("EMAIL_PORT") || "587"),
  emailUser: getEnv("EMAIL_USER"),
  emailPassword: getEnv("EMAIL_PASSWORD"),
  messagingProvider: getEnv("MESSAGING_PROVIDER") || "twilio",
  termiiApiKey: getEnv("TERMII_API_KEY"),
  termiiSenderId: getEnv("TERMII_SENDER_ID"),
  termiiWhatsappFrom: getEnv("TERMII_WHATSAPP_FROM") || getEnv("TERMII_SENDER_ID"),
  termiiBaseUrl: getEnv("TERMII_BASE_URL") || "https://api.ng.termii.com",
  termiiSmsEndpoint: getEnv("TERMII_SMS_ENDPOINT") || "/api/sms/send",
  termiiWhatsappEndpoint: getEnv("TERMII_WHATSAPP_ENDPOINT") || "/api/whatsapp/send",
  twilioAccountSid: getEnv("TWILIO_ACCOUNT_SID"),
  twilioAuthToken: getEnv("TWILIO_AUTH_TOKEN"),
  twilioSmsFrom: getEnv("TWILIO_SMS_FROM"),
  twilioWhatsappFrom: getEnv("TWILIO_WHATSAPP_FROM"),
  enableSmsDelivery: getEnvBoolean("ENABLE_SMS_DELIVERY", true),
  enableWhatsappDelivery: getEnvBoolean("ENABLE_WHATSAPP_DELIVERY", false),
};

export function hasSupabaseCredentials() {
  return Boolean(env.supabaseUrl && env.supabaseAnonKey && env.supabaseServiceRoleKey);
}
