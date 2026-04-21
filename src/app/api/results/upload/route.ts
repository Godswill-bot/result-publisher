import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin-session";
import { uploadResultFiles } from "@/lib/workflow";

function extractFiles(formData: FormData) {
  return formData.getAll("files").filter((item): item is File => item instanceof File);
}

export async function POST(request: Request) {
  await requireAdmin();
  const formData = await request.formData();
  const files = extractFiles(formData);

  if (files.length === 0) {
    return NextResponse.json({ message: "Select at least one PDF file" }, { status: 400 });
  }

  const outcomes = await uploadResultFiles(files);
  const hasErrors = outcomes.some((outcome) => outcome.status !== "uploaded");

  return NextResponse.json(
    {
      message: hasErrors ? "Some files could not be processed" : "All PDFs uploaded successfully",
      outcomes,
    },
    { status: hasErrors ? 207 : 201 },
  );
}
