import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin-session";
import { publishResults } from "@/lib/workflow";
import { publishResultsSchema } from "@/lib/validation";

export async function POST(request: Request) {
  await requireAdmin();

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
    const hasErrors = outcomes.some((outcome) => outcome.status === "failed");

    return NextResponse.json(
      {
        message: hasErrors ? "Some deliveries failed" : "All queued deliveries were published",
        outcomes,
      },
      { status: hasErrors ? 207 : 200 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "Publish failed",
      },
      { status: 500 },
    );
  }
}
