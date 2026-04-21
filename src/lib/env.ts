export function requireEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export const env = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  supabaseStorageBucket: process.env.SUPABASE_STORAGE_BUCKET ?? "student-results",
  adminSessionSecret: process.env.ADMIN_SESSION_SECRET ?? "",
  emailFrom: process.env.EMAIL_FROM ?? "",
  emailHost: process.env.EMAIL_HOST ?? "",
  emailPort: Number(process.env.EMAIL_PORT ?? "587"),
  emailUser: process.env.EMAIL_USER ?? "",
  emailPassword: process.env.EMAIL_PASSWORD ?? "",
  messagingProvider: process.env.MESSAGING_PROVIDER ?? "termii",
  termiiApiKey: process.env.TERMII_API_KEY ?? "",
  termiiSenderId: process.env.TERMII_SENDER_ID ?? "",
  termiiBaseUrl: process.env.TERMII_BASE_URL ?? "https://api.ng.termii.com",
  termiiSmsEndpoint: process.env.TERMII_SMS_ENDPOINT ?? "/api/sms/send",
  termiiWhatsappEndpoint: process.env.TERMII_WHATSAPP_ENDPOINT ?? "/api/whatsapp/send",
  twilioAccountSid: process.env.TWILIO_ACCOUNT_SID ?? "",
  twilioAuthToken: process.env.TWILIO_AUTH_TOKEN ?? "",
  twilioSmsFrom: process.env.TWILIO_SMS_FROM ?? "",
  twilioWhatsappFrom: process.env.TWILIO_WHATSAPP_FROM ?? "",
};

export function hasSupabaseCredentials() {
  return Boolean(env.supabaseUrl && env.supabaseAnonKey && env.supabaseServiceRoleKey);
}
