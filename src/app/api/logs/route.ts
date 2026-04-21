import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin-session";
import { createSupabaseServiceClient } from "@/lib/supabase";

export async function GET() {
  await requireAdmin();

  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase.from("notifications").select("*").order("timestamp", { ascending: false });

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json({ logs: data ?? [] });
}
