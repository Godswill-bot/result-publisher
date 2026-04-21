import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

import { attachAdminSession } from "@/lib/admin-session";
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
    return NextResponse.json({ message: "Invalid admin credentials" }, { status: 401 });
  }

  const passwordMatches = await bcrypt.compare(parsed.data.password, data.password_hash);
  if (!passwordMatches) {
    return NextResponse.json({ message: "Invalid admin credentials" }, { status: 401 });
  }

  const response = NextResponse.json({ message: "Login successful" });
  attachAdminSession(response, data.email);
  return response;
}
