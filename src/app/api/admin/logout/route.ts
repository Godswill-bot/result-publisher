import { NextResponse } from "next/server";

import { getCurrentAdmin } from "@/lib/admin-session";
import { logAdminAction } from "@/lib/admin-logs";
import { ADMIN_SESSION_COOKIE } from "@/lib/admin-session";

export async function POST() {
  const admin = await getCurrentAdmin();
  if (admin) {
    await logAdminAction({
      adminEmail: admin.email,
      action: "logout",
      status: "success",
      detail: "Admin signed out",
    });
  }

  const response = NextResponse.json({ message: "Signed out" });
  response.cookies.set(ADMIN_SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return response;
}
