import { NextResponse } from "next/server";

import { registerStudent, updateStudentContacts } from "@/lib/workflow";
import { studentContactUpdateSchema, studentRegistrationSchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
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
      const normalized = result.message.toLowerCase();
      const status =
        normalized.includes("duplicate") ||
        normalized.includes("already exists") ||
        normalized.includes("unique")
          ? 409
          : 400;

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
  } catch (error) {
    const message = error instanceof Error ? error.message : "Registration failed";

    if (message.includes("Missing required environment variable")) {
      return NextResponse.json(
        {
          message:
            "Server setup incomplete: required Supabase variables are missing. Add NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY to deployment environment variables, then redeploy.",
        },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        message: "An unexpected server error occurred while saving registration.",
      },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const payload = await request.json().catch(() => null);
    const parsed = studentContactUpdateSchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json(
        {
          message: parsed.error.issues.map((issue) => issue.message).join(", "),
        },
        { status: 400 },
      );
    }

    const result = await updateStudentContacts(parsed.data);
    if (!result.success) {
      const normalized = result.message.toLowerCase();
      const status =
        normalized.includes("already") || normalized.includes("exists") || normalized.includes("duplicate")
          ? 409
          : normalized.includes("no student")
            ? 404
            : 400;
      return NextResponse.json({ message: result.message }, { status });
    }

    return NextResponse.json(
      {
        message: "Contact details updated successfully",
        student: {
          matricNumber: result.matricNumber,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Update failed";

    if (message.includes("Missing required environment variable")) {
      return NextResponse.json(
        {
          message:
            "Server setup incomplete: required Supabase variables are missing. Add NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY to deployment environment variables, then redeploy.",
        },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        message: "An unexpected server error occurred while updating contact details.",
      },
      { status: 500 },
    );
  }
}
