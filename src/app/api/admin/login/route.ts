import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

import { attachAdminSession } from "@/lib/admin-session";
import { logAdminAction } from "@/lib/admin-logs";
import { createSupabaseServiceClient } from "@/lib/supabase";
import { adminLoginSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  const parsed = adminLoginSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues.map((issue) => issue.message).join(", ") },
      { status: 400 },
    );
  }

  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("admins")
    .select("email,password_hash")
    .eq("email", parsed.data.email)
    .maybeSingle();

  if (error || !data) {
    await logAdminAction({
      adminEmail: parsed.data.email,
      action: "login",
      status: "failed",
      detail: "Invalid admin credentials",
    });
    return NextResponse.json({ message: "Invalid admin credentials" }, { status: 401 });
  }

  const passwordMatches = await bcrypt.compare(parsed.data.password, data.password_hash);
  if (!passwordMatches) {
    await logAdminAction({
      adminEmail: parsed.data.email,
      action: "login",
      status: "failed",
      detail: "Invalid admin credentials",
    });
    return NextResponse.json({ message: "Invalid admin credentials" }, { status: 401 });
  }

  await logAdminAction({
    adminEmail: data.email,
    action: "login",
    status: "success",
    detail: "Admin signed in",
  });

  const response = NextResponse.json({ message: "Login successful" });
  attachAdminSession(response, data.email);
  return response;
}
