import { NextResponse } from "next/server";

import { logAdminAction } from "@/lib/admin-logs";
import { requireAdmin } from "@/lib/admin-session";
import { uploadResultFiles } from "@/lib/workflow";

function extractFiles(formData: FormData) {
  return formData.getAll("files").filter((item): item is File => item instanceof File);
}

export async function POST(request: Request) {
  const admin = await requireAdmin();
  const formData = await request.formData();
  const files = extractFiles(formData);

  if (files.length === 0) {
    return NextResponse.json({ message: "Select at least one PDF file" }, { status: 400 });
  }

  const outcomes = await uploadResultFiles(files);
  const hasErrors = outcomes.some((outcome) => outcome.status !== "uploaded");

  await logAdminAction({
    adminEmail: admin.email,
    action: "upload_results",
    target: `${files.length} file(s)`,
    status: hasErrors ? "failed" : "success",
    detail: hasErrors ? "One or more uploads failed" : "All selected files uploaded",
  });

  return NextResponse.json(
    {
      message: hasErrors ? "Some files could not be processed" : "All PDFs uploaded successfully",
      outcomes,
    },
    { status: hasErrors ? 207 : 201 },
  );
}
