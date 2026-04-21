import { createSupabaseServiceClient } from "./supabase";

export async function logAdminAction(params: {
  adminEmail: string;
  action: string;
  target?: string | null;
  status?: "success" | "failed";
  detail?: string | null;
}) {
  const supabase = createSupabaseServiceClient();

  await supabase.from("admin_logs").insert({
    admin_email: params.adminEmail,
    action: params.action,
    target: params.target ?? null,
    status: params.status ?? "success",
    detail: params.detail ?? null,
    created_at: new Date().toISOString(),
  });
}
