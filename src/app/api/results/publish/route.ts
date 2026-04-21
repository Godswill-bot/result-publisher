import { NextResponse } from "next/server";

import { logAdminAction } from "@/lib/admin-logs";
import { requireAdmin } from "@/lib/admin-session";
import { publishResults } from "@/lib/workflow";
import { publishResultsSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const admin = await requireAdmin();

  const payload = await request.json().catch(() => ({}));
  const parsed = publishResultsSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues.map((issue) => issue.message).join(", ") },
      { status: 400 },
    );
  }

  try {
    const outcomes = await publishResults(parsed.data);

    if (outcomes.length === 0) {
      await logAdminAction({
        adminEmail: admin.email,
        action: "publish_results",
        target: "0 result(s)",
        status: "failed",
        detail: "No uploaded results found. Upload and match result PDFs before publishing.",
      });

      return NextResponse.json(
        {
          message: "No uploaded results found. Upload and match result PDFs before publishing.",
          outcomes: [],
        },
        { status: 400 },
      );
    }

    const hasErrors = outcomes.some((outcome) => outcome.status === "failed");

    await logAdminAction({
      adminEmail: admin.email,
      action: "publish_results",
      target: `${outcomes.length} result(s)`,
      status: hasErrors ? "failed" : "success",
      detail: hasErrors ? "Some results failed to publish" : "Publish completed",
    });

    return NextResponse.json(
      {
        message: hasErrors ? "Some deliveries failed" : "All queued deliveries were published",
        outcomes,
      },
      { status: hasErrors ? 207 : 200 },
    );
  } catch (error) {
    await logAdminAction({
      adminEmail: admin.email,
      action: "publish_results",
      status: "failed",
      detail: error instanceof Error ? error.message : "Publish failed",
    });

    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "Publish failed",
      },
      { status: 500 },
    );
  }
}
