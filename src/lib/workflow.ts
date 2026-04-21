import { createSupabaseAnonClient, createSupabaseServiceClient, getStorageBucketName } from "./supabase";
import { getResultStoragePath, isPdfFile, normalizeMatricNumber, parseMatricNumberFromFilename } from "./pdf";
import { studentRegistrationSchema, publishResultsSchema, type PublishResultsInput, type StudentRegistrationInput } from "./validation";
import type { DashboardStats, NotificationRecord, ResultRecord, StudentRecord } from "./types";
import { sendEmailNotification, sendSmsNotification, sendWhatsAppNotification } from "./notifications";

const resultLinkTtlSeconds = 60 * 60 * 24 * 7;

export type UploadOutcome = {
  matricNumber: string;
  status: "uploaded" | "skipped" | "error";
  message: string;
};

export type PublishOutcome = {
  matricNumber: string;
  status: "sent" | "skipped" | "failed";
  message: string;
};

export type RegistrationOutcome =
  | { success: true; matricNumber: string }
  | { success: false; message: string };

export async function registerStudent(input: StudentRegistrationInput): Promise<RegistrationOutcome> {
  const parsed = studentRegistrationSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues.map((issue) => issue.message).join(", "),
    };
  }

  const supabase = createSupabaseAnonClient();
  const { error } = await supabase.from("students").insert({
    full_name: parsed.data.fullName,
    matric_number: normalizeMatricNumber(parsed.data.matricNumber),
    email: parsed.data.email,
    mtu_email: parsed.data.mtuEmail,
    phone_number: parsed.data.phoneNumber,
    parent_email: parsed.data.parentEmail,
    parent_phone: parsed.data.parentPhone,
  });

  if (error) {
    return { success: false, message: error.message };
  }

  return { success: true, matricNumber: normalizeMatricNumber(parsed.data.matricNumber) };
}

export async function uploadResultFiles(files: File[]): Promise<UploadOutcome[]> {
  const supabase = createSupabaseServiceClient();
  const bucket = getStorageBucketName();
  const outcomes: UploadOutcome[] = [];

  for (const file of files) {
    try {
      if (!isPdfFile(file)) {
        outcomes.push({
          matricNumber: "unknown",
          status: "error",
          message: `${file.name} is not a PDF file`,
        });
        continue;
      }

      const matricNumber = parseMatricNumberFromFilename(file.name);
      const storagePath = getResultStoragePath(matricNumber);

      const { data: student, error: studentError } = await supabase
        .from("students")
        .select("matric_number, full_name")
        .eq("matric_number", matricNumber)
        .maybeSingle();

      if (studentError || !student) {
        outcomes.push({
          matricNumber,
          status: "skipped",
          message: `No student record found for ${matricNumber}`,
        });
        continue;
      }

      const bytes = await file.arrayBuffer();
      const uploadResult = await supabase.storage.from(bucket).upload(storagePath, bytes, {
        contentType: "application/pdf",
        upsert: true,
      });

      if (uploadResult.error) {
        outcomes.push({
          matricNumber,
          status: "error",
          message: uploadResult.error.message,
        });
        continue;
      }

      const { error: resultError } = await supabase.from("results").upsert(
        {
          matric_number: matricNumber,
          pdf_url: storagePath,
          uploaded_at: new Date().toISOString(),
          published_at: null,
          delivery_state: "pending",
          delivery_attempts: 0,
          last_error: null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "matric_number" },
      );

      if (resultError) {
        outcomes.push({
          matricNumber,
          status: "error",
          message: resultError.message,
        });
        continue;
      }

      outcomes.push({
        matricNumber,
        status: "uploaded",
        message: `Uploaded result for ${student.full_name}`,
      });
    } catch (error) {
      outcomes.push({
        matricNumber: "unknown",
        status: "error",
        message: error instanceof Error ? error.message : "Unexpected upload failure",
      });
    }
  }

  return outcomes;
}

async function getLatestNotification(matricNumber: string) {
  const supabase = createSupabaseServiceClient();
  const { data } = await supabase
    .from("notifications")
    .select("*")
    .eq("matric_number", matricNumber)
    .order("timestamp", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data as NotificationRecord | null;
}

async function loadStudent(matricNumber: string) {
  const supabase = createSupabaseServiceClient();
  const { data: student } = await supabase
    .from("students")
    .select("*")
    .eq("matric_number", matricNumber)
    .maybeSingle();

  return student as StudentRecord | null;
}

async function getSignedResultUrl(storagePath: string) {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase.storage
    .from(getStorageBucketName())
    .createSignedUrl(storagePath, resultLinkTtlSeconds);

  if (error || !data?.signedUrl) {
    throw new Error(error?.message ?? "Unable to create a signed result URL");
  }

  return data.signedUrl;
}

async function sendEmailBundle(student: StudentRecord, signedUrl: string, matricNumber: string) {
  const recipients = [student.email, student.mtu_email, student.parent_email];
  const subject = `Result published for ${matricNumber}`;
  const baseText = [
    `Hello ${student.full_name},`,
    `Your result for ${matricNumber} is now available.`,
    `Download link: ${signedUrl}`,
    "This link expires after seven days.",
  ].join("\n\n");

  const errors: string[] = [];

  for (const recipient of recipients) {
    const outcome = await sendEmailNotification({
      to: recipient,
      subject,
      text: baseText,
      html: `<p>Hello ${student.full_name},</p><p>Your result for <strong>${matricNumber}</strong> is now available.</p><p><a href="${signedUrl}">Download the PDF result</a></p><p>This link expires after seven days.</p>`,
      attachmentUrl: signedUrl,
      attachmentName: `${matricNumber}.pdf`,
    });

    if (!outcome.success) {
      errors.push(`${recipient}: ${outcome.error ?? "Email failed"}`);
    }
  }

  return {
    status: errors.length === 0 ? ("success" as const) : ("failed" as const),
    errors,
  };
}

async function sendSmsBundle(student: StudentRecord, signedUrl: string, matricNumber: string) {
  const recipients = [student.phone_number, student.parent_phone];
  const errors: string[] = [];
  const message = `MTU result published for ${matricNumber}. Download: ${signedUrl}`;

  for (const recipient of recipients) {
    const outcome = await sendSmsNotification({
      to: recipient,
      message,
    });

    if (!outcome.success) {
      errors.push(`${recipient}: ${outcome.error ?? "SMS failed"}`);
    }
  }

  return {
    status: errors.length === 0 ? ("success" as const) : ("failed" as const),
    errors,
  };
}

async function sendWhatsAppBundle(student: StudentRecord, signedUrl: string, matricNumber: string) {
  const recipients = [student.phone_number, student.parent_phone];
  const errors: string[] = [];
  const message = [
    `MTU result published for ${matricNumber}.`,
    `Download: ${signedUrl}`,
    "Please keep this link private.",
  ].join("\n");

  for (const recipient of recipients) {
    const outcome = await sendWhatsAppNotification({
      to: recipient,
      message,
    });

    if (!outcome.success) {
      errors.push(`${recipient}: ${outcome.error ?? "WhatsApp failed"}`);
    }
  }

  return {
    status: errors.length === 0 ? ("success" as const) : ("failed" as const),
    errors,
  };
}

async function storeNotificationLog(params: {
  matricNumber: string;
  emailStatus: string;
  smsStatus: string;
  whatsappStatus: string;
  errorMessage: string | null;
}) {
  const supabase = createSupabaseServiceClient();
  await supabase.from("notifications").insert({
    matric_number: params.matricNumber,
    email_status: params.emailStatus,
    sms_status: params.smsStatus,
    whatsapp_status: params.whatsappStatus,
    error_message: params.errorMessage,
    timestamp: new Date().toISOString(),
  });
}

async function updateResultState(params: {
  matricNumber: string;
  deliveryState: string;
  lastError: string | null;
  deliveryAttempts: number;
}) {
  const supabase = createSupabaseServiceClient();
  await supabase
    .from("results")
    .update({
      delivery_state: params.deliveryState,
      published_at: params.deliveryState === "sent" ? new Date().toISOString() : null,
      last_error: params.lastError,
      delivery_attempts: params.deliveryAttempts,
      updated_at: new Date().toISOString(),
    })
    .eq("matric_number", params.matricNumber);
}

export async function publishResults(input: Partial<PublishResultsInput> = {}) {
  const parsed = publishResultsSchema.parse(input);
  const supabase = createSupabaseServiceClient();

  let query = supabase.from("results").select("*").order("uploaded_at", { ascending: false });

  if (parsed.matricNumbers?.length) {
    query = query.in("matric_number", parsed.matricNumbers.map(normalizeMatricNumber));
  }

  const { data: results, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  const outputs: PublishOutcome[] = [];

  for (const result of (results ?? []) as ResultRecord[]) {
    const matricNumber = normalizeMatricNumber(result.matric_number);
    const student = await loadStudent(matricNumber);

    if (!student) {
      outputs.push({
        matricNumber,
        status: "failed",
        message: "Student record is missing",
      });
      await updateResultState({
        matricNumber,
        deliveryState: "failed",
        lastError: "Student record is missing",
        deliveryAttempts: result.delivery_attempts + 1,
      });
      await storeNotificationLog({
        matricNumber,
        emailStatus: "failed",
        smsStatus: "failed",
        whatsappStatus: "failed",
        errorMessage: "Student record is missing",
      });
      continue;
    }

    if (result.delivery_state === "sent" && parsed.retryOnlyFailed) {
      outputs.push({
        matricNumber,
        status: "skipped",
        message: "Already delivered successfully",
      });
      continue;
    }

    const latestNotification = await getLatestNotification(matricNumber);
    if (
      latestNotification &&
      latestNotification.email_status === "success" &&
      latestNotification.sms_status === "success" &&
      latestNotification.whatsapp_status === "success" &&
      parsed.retryOnlyFailed
    ) {
      outputs.push({
        matricNumber,
        status: "skipped",
        message: "Latest delivery already succeeded",
      });
      await updateResultState({
        matricNumber,
        deliveryState: "sent",
        lastError: null,
        deliveryAttempts: result.delivery_attempts,
      });
      continue;
    }

    try {
      const signedUrl = await getSignedResultUrl(result.pdf_url);
      const [emailBundle, smsBundle, whatsappBundle] = await Promise.all([
        sendEmailBundle(student, signedUrl, matricNumber),
        sendSmsBundle(student, signedUrl, matricNumber),
        sendWhatsAppBundle(student, signedUrl, matricNumber),
      ]);

      const emailStatus = emailBundle.status;
      const smsStatus = smsBundle.status;
      const whatsappStatus = whatsappBundle.status;
      const errors = [...emailBundle.errors, ...smsBundle.errors, ...whatsappBundle.errors];
      const deliveryState = errors.length === 0 ? "sent" : "partial";

      await storeNotificationLog({
        matricNumber,
        emailStatus,
        smsStatus,
        whatsappStatus,
        errorMessage: errors.length > 0 ? errors.join(" | ") : null,
      });
      await updateResultState({
        matricNumber,
        deliveryState: errors.length === 0 ? "sent" : deliveryState,
        lastError: errors.length > 0 ? errors.join(" | ") : null,
        deliveryAttempts: result.delivery_attempts + 1,
      });

      outputs.push({
        matricNumber,
        status: errors.length === 0 ? "sent" : "failed",
        message: errors.length === 0 ? "Distribution completed" : errors.join(" | "),
      });
    } catch (publishError) {
      const message = publishError instanceof Error ? publishError.message : "Distribution failed";
      await storeNotificationLog({
        matricNumber,
        emailStatus: "failed",
        smsStatus: "failed",
        whatsappStatus: "failed",
        errorMessage: message,
      });
      await updateResultState({
        matricNumber,
        deliveryState: "failed",
        lastError: message,
        deliveryAttempts: result.delivery_attempts + 1,
      });
      outputs.push({
        matricNumber,
        status: "failed",
        message,
      });
    }
  }

  return outputs;
}

export async function getDashboardSnapshot() {
  const supabase = createSupabaseServiceClient();

  const [studentsResult, resultsResult, logsResult] = await Promise.all([
    supabase.from("students").select("*").order("created_at", { ascending: false }),
    supabase.from("results").select("*").order("uploaded_at", { ascending: false }),
    supabase.from("notifications").select("*").order("timestamp", { ascending: false }),
  ]);

  if (studentsResult.error) {
    throw new Error(studentsResult.error.message);
  }

  if (resultsResult.error) {
    throw new Error(resultsResult.error.message);
  }

  if (logsResult.error) {
    throw new Error(logsResult.error.message);
  }

  const students = (studentsResult.data ?? []) as StudentRecord[];
  const results = (resultsResult.data ?? []) as ResultRecord[];
  const logs = (logsResult.data ?? []) as NotificationRecord[];

  const stats: DashboardStats = {
    studentCount: students.length,
    resultCount: results.length,
    publishedCount: results.filter((item) => item.delivery_state === "sent").length,
    pendingCount: results.filter((item) => item.delivery_state === "pending").length,
    failedDeliveries: logs.filter(
      (item) =>
        item.email_status === "failed" ||
        item.sms_status === "failed" ||
        item.whatsapp_status === "failed",
    ).length,
    partialDeliveries: logs.filter(
      (item) =>
        [item.email_status, item.sms_status, item.whatsapp_status].includes("success") &&
        [item.email_status, item.sms_status, item.whatsapp_status].includes("failed"),
    ).length,
  };

  return { students, results, logs, stats };
}
