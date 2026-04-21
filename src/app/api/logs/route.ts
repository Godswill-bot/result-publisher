import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin-session";
import { createSupabaseServiceClient } from "@/lib/supabase";

export async function GET() {
  await requireAdmin();

  const supabase = createSupabaseServiceClient();
  const [deliveryLogsResult, adminLogsResult] = await Promise.all([
    supabase.from("notifications").select("*").order("timestamp", { ascending: false }),
    supabase.from("admin_logs").select("*").order("created_at", { ascending: false }),
  ]);

  if (deliveryLogsResult.error) {
    return NextResponse.json({ message: deliveryLogsResult.error.message }, { status: 500 });
  }

  if (adminLogsResult.error) {
    return NextResponse.json({ message: adminLogsResult.error.message }, { status: 500 });
  }

  return NextResponse.json({
    deliveryLogs: deliveryLogsResult.data ?? [],
    adminLogs: adminLogsResult.data ?? [],
  });
}
