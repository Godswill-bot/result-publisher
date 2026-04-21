import { NextResponse } from "next/server";

import { registerStudent } from "@/lib/workflow";
import { studentRegistrationSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  const parsed = studentRegistrationSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      {
        message: parsed.error.issues.map((issue) => issue.message).join(", "),
      },
      { status: 400 },
    );
  }

  const result = await registerStudent(parsed.data);

  if (!result.success) {
    const status = result.message.toLowerCase().includes("duplicate") ? 409 : 400;
    return NextResponse.json({ message: result.message }, { status });
  }

  return NextResponse.json(
    {
      message: "Student registration saved",
      student: {
        matricNumber: result.matricNumber,
      },
    },
    { status: 201 },
  );
}
