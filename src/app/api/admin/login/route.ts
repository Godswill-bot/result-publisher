import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

import { attachAdminSession } from "@/lib/admin-session";
import { logAdminAction } from "@/lib/admin-logs";
import { sendEmailNotification } from "@/lib/notifications";
import { createSupabaseServiceClient } from "@/lib/supabase";
import { adminLoginSchema } from "@/lib/validation";

async function checkFailedLoginAttempts(email: string): Promise<number> {
  const supabase = createSupabaseServiceClient();
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("admin_logs")
    .select("id")
    .eq("admin_email", email)
    .eq("action", "login")
    .eq("status", "failed")
    .gte("created_at", oneHourAgo);

  if (error) {
    console.error("Error checking failed login attempts:", error);
    return 0;
  }

  return data?.length ?? 0;
}

async function sendSecurityAlert(email: string, attemptCount: number) {
  try {
    await sendEmailNotification({
      to: email,
      subject: `⚠️ Security Alert: Multiple Failed Login Attempts`,
      text: `
Dear Administrator,

We detected ${attemptCount} failed login attempt(s) to your admin account in the last hour.

Email: ${email}
Time: ${new Date().toLocaleString()}

If this was not you, please:
1. Reset your password immediately
2. Review your admin logs for suspicious activities
3. Contact the system administrator if needed

If you made these attempts, you can ignore this message.

Best regards,
Student Result Distribution System
      `.trim(),
      html: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <div style="background-color: #fee2e2; border-left: 4px solid #dc2626; padding: 16px; margin-bottom: 24px;">
    <h2 style="color: #dc2626; margin-top: 0;">⚠️ Security Alert: Multiple Failed Login Attempts</h2>
    <p>We detected <strong>${attemptCount} failed login attempt(s)</strong> to your admin account in the last hour.</p>
  </div>
  
  <div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; margin-bottom: 24px;">
    <p><strong>Email:</strong> ${email}</p>
    <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
  </div>
  
  <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin-bottom: 24px;">
    <p><strong>If this was not you, please:</strong></p>
    <ol>
      <li>Reset your password immediately</li>
      <li>Review your admin logs for suspicious activities</li>
      <li>Contact the system administrator if needed</li>
    </ol>
  </div>
  
  <div style="color: #6b7280; font-size: 12px;">
    <p>If you made these attempts, you can ignore this message.</p>
    <p>Best regards,<br>Student Result Distribution System</p>
  </div>
</div>
      `.trim(),
    });
  } catch (error) {
    console.error("Failed to send security alert email:", error);
  }
}

export async function POST(request: Request) {
  try {
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

      // Check failed attempts and send alert if threshold reached
      const failedAttempts = await checkFailedLoginAttempts(parsed.data.email);
      if (failedAttempts >= 3) {
        await sendSecurityAlert(parsed.data.email, failedAttempts);
      }

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

      // Check failed attempts and send alert if threshold reached
      const failedAttempts = await checkFailedLoginAttempts(data.email);
      if (failedAttempts >= 3) {
        await sendSecurityAlert(data.email, failedAttempts);
      }

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
  } catch (error) {
    const message = error instanceof Error ? error.message : "Login failed";

    if (message.includes("Missing required environment variable")) {
      return NextResponse.json(
        {
          message:
            "Server setup incomplete on deployment. Add NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and ADMIN_SESSION_SECRET in Vercel Environment Variables, then redeploy.",
        },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        message: "An unexpected server error occurred during admin login.",
      },
      { status: 500 },
    );
  }
}
