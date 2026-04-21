import { NextResponse } from "next/server";

import { logAdminAction } from "@/lib/admin-logs";
import { requireAdmin } from "@/lib/admin-session";
import { removeUploadedResult } from "@/lib/workflow";
import { removeResultSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const admin = await requireAdmin();
  const payload = await request.json().catch(() => null);
  const parsed = removeResultSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues.map((issue) => issue.message).join(", ") },
      { status: 400 },
    );
  }

  const outcome = await removeUploadedResult(parsed.data.matricNumber);

  await logAdminAction({
    adminEmail: admin.email,
    action: "remove_uploaded_result",
    target: parsed.data.matricNumber,
    status: outcome.success ? "success" : "failed",
    detail: outcome.message,
  });

  if (!outcome.success) {
    const status = outcome.message.toLowerCase().includes("no uploaded result") ? 404 : 400;
    return NextResponse.json({ message: outcome.message }, { status });
  }

  return NextResponse.json({ message: outcome.message }, { status: 200 });
}
