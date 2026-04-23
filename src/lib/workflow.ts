import { createSupabaseAnonClient, createSupabaseServiceClient, getStorageBucketName } from "./supabase";
import { getResultStoragePath, isPdfFile, normalizeMatricNumber, parseMatricNumberFromFilename, extractMatricNumberFromPdf, isResultDocument } from "./pdf";
import {
  studentRegistrationSchema,
  studentContactUpdateSchema,
  publishResultsSchema,
  type PublishResultsInput,
  type StudentContactUpdateInput,
  type StudentRegistrationInput,
} from "./validation";
import type { AdminLogRecord, DashboardStats, NotificationRecord, ResultRecord, StudentRecord } from "./types";
import { sendEmailNotification, sendSmsNotification, sendWhatsAppNotification } from "./notifications";
import { env } from "./env";

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

export type RemoveOutcome = {
  success: boolean;
  matricNumber: string;
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
  const normalizedMatric = normalizeMatricNumber(parsed.data.matricNumber);
  const { data: existingRecords, error: lookupError } = await supabase
    .from("students")
    .select("matric_number,email,mtu_email,phone_number,parent_email,parent_phone")
    .or(
      [
        `matric_number.eq.${normalizedMatric}`,
        `email.eq.${parsed.data.email}`,
        `mtu_email.eq.${parsed.data.mtuEmail}`,
        `phone_number.eq.${parsed.data.phoneNumber}`,
        `parent_email.eq.${parsed.data.parentEmail}`,
        `parent_phone.eq.${parsed.data.parentPhone}`,
      ].join(","),
    );

  if (lookupError) {
    return { success: false, message: lookupError.message };
  }

  if (existingRecords && existingRecords.length > 0) {
    return {
      success: false,
      message:
        "Registration already exists with the same matric number, email, or phone details. Duplicate registrations are not allowed.",
    };
  }

  const { error } = await supabase.from("students").insert({
    full_name: parsed.data.fullName,
    matric_number: normalizedMatric,
    email: parsed.data.email,
    mtu_email: parsed.data.mtuEmail,
    phone_number: parsed.data.phoneNumber,
    parent_email: parsed.data.parentEmail,
    parent_phone: parsed.data.parentPhone,
  });

  if (error) {
    return { success: false, message: error.message };
  }

  return { success: true, matricNumber: normalizedMatric };
}

export async function updateStudentContacts(input: StudentContactUpdateInput): Promise<RegistrationOutcome> {
  const parsed = studentContactUpdateSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues.map((issue) => issue.message).join(", "),
    };
  }

  const supabase = createSupabaseAnonClient();
  const matricNumber = normalizeMatricNumber(parsed.data.matricNumber);

  const updates = {
    ...(parsed.data.email ? { email: parsed.data.email } : {}),
    ...(parsed.data.mtuEmail ? { mtu_email: parsed.data.mtuEmail } : {}),
    ...(parsed.data.phoneNumber ? { phone_number: parsed.data.phoneNumber } : {}),
    ...(parsed.data.parentEmail ? { parent_email: parsed.data.parentEmail } : {}),
    ...(parsed.data.parentPhone ? { parent_phone: parsed.data.parentPhone } : {}),
  };

  const { data: existing } = await supabase
    .from("students")
    .select("matric_number")
    .eq("matric_number", matricNumber)
    .maybeSingle();

  if (!existing) {
    return {
      success: false,
      message: "No student found with the provided matric number",
    };
  }

  const duplicateFilters: string[] = [];
  if (parsed.data.email) duplicateFilters.push(`email.eq.${parsed.data.email}`);
  if (parsed.data.mtuEmail) duplicateFilters.push(`mtu_email.eq.${parsed.data.mtuEmail}`);
  if (parsed.data.phoneNumber) duplicateFilters.push(`phone_number.eq.${parsed.data.phoneNumber}`);
  if (parsed.data.parentEmail) duplicateFilters.push(`parent_email.eq.${parsed.data.parentEmail}`);
  if (parsed.data.parentPhone) duplicateFilters.push(`parent_phone.eq.${parsed.data.parentPhone}`);

  if (duplicateFilters.length > 0) {
    const { data: duplicates } = await supabase
      .from("students")
      .select("matric_number")
      .neq("matric_number", matricNumber)
      .or(duplicateFilters.join(","));

    if (duplicates && duplicates.length > 0) {
      return {
        success: false,
        message: "One or more provided contact fields are already used by another student",
      };
    }
  }

  const { error } = await supabase.from("students").update(updates).eq("matric_number", matricNumber);

  if (error) {
    return { success: false, message: error.message };
  }

  return { success: true, matricNumber };
}

export async function uploadResultFiles(files: File[]): Promise<UploadOutcome[]> {
  const supabase = createSupabaseServiceClient();
  const bucket = getStorageBucketName();

  // OPTIMIZATION: Process all files in parallel (extract buffers, validate, extract matric numbers)
  const fileProcessingPromises = files.map(async (file) => {
    try {
      if (!isPdfFile(file)) {
        return {
          file,
          matricNumber: "unknown",
          status: "error" as const,
          message: `${file.name} is not a PDF file`,
        };
      }

      const bytes = await file.arrayBuffer();

      // Validate document type
      const isValidResult = await isResultDocument(bytes);
      if (!isValidResult) {
        return {
          file,
          matricNumber: "unknown",
          status: "error" as const,
          message: `${file.name} is not a valid result document. Missing 'Submission ID' marker. Ensure the PDF is an actual result sheet.`,
        };
      }

      // Extract matric number
      let matricNumber = await extractMatricNumberFromPdf(bytes);
      if (!matricNumber) {
        try {
          matricNumber = parseMatricNumberFromFilename(file.name);
          console.warn(`[extract] PDF extraction failed for ${file.name}, using filename instead`);
        } catch (e) {
          return {
            file,
            matricNumber: "unknown",
            status: "error" as const,
            message: `Could not extract matric number from PDF content or filename: ${file.name}`,
          };
        }
      } else {
        console.info(`[extract] Successfully extracted ${matricNumber} from PDF content`);
      }

      return {
        file,
        bytes,
        matricNumber,
        status: "pending" as const,
      };
    } catch (error) {
      return {
        file,
        matricNumber: "unknown",
        status: "error" as const,
        message: error instanceof Error ? error.message : "Unexpected upload failure",
      };
    }
  });

  const processedFiles = await Promise.all(fileProcessingPromises);

  // Extract valid files for batch student lookup
  const validFiles = processedFiles.filter(
    (p) => p.status === "pending",
  ) as Array<{ file: File; bytes: ArrayBuffer; matricNumber: string; status: "pending" }>;

  // OPTIMIZATION: Batch student lookup instead of individual queries
  const matricNumbers = validFiles.map((p) => p.matricNumber);
  const { data: studentsData } = await supabase
    .from("students")
    .select("matric_number, full_name")
    .in("matric_number", matricNumbers);
  const students = studentsData ?? [];
  const studentsByMatric = new Map(students.map((s) => [s.matric_number, s]));

  // OPTIMIZATION: Upload all files to storage in parallel
  const uploadPromises = validFiles.map(async (processed) => {
    const student = studentsByMatric.get(processed.matricNumber);
    if (!student) {
      return {
        matricNumber: processed.matricNumber,
        status: "skipped" as const,
        message: `No student record found for ${processed.matricNumber}`,
      };
    }

    const storagePath = getResultStoragePath(processed.matricNumber);
    const uploadResult = await supabase.storage.from(bucket).upload(storagePath, processed.bytes, {
      contentType: "application/pdf",
      upsert: true,
    });

    if (uploadResult.error) {
      return {
        matricNumber: processed.matricNumber,
        status: "error" as const,
        message: uploadResult.error.message,
      };
    }

    return {
      matricNumber: processed.matricNumber,
      storagePath,
      student,
      status: "uploaded" as const,
    };
  });

  const uploadResults = await Promise.all(uploadPromises);

  // OPTIMIZATION: Batch all database inserts with a single upsert
  const successfulUploads = uploadResults.filter((r) => r.status === "uploaded");
  if (successfulUploads.length > 0) {
    const now = new Date().toISOString();
    const resultsToInsert = successfulUploads.map((r) => ({
      matric_number: r.matricNumber,
      pdf_url: r.storagePath,
      uploaded_at: now,
      published_at: null,
      delivery_state: "pending",
      delivery_attempts: 0,
      last_error: null,
      updated_at: now,
    }));

    await supabase.from("results").upsert(resultsToInsert, { onConflict: "matric_number" });
  }

  // Compile final outcomes
  const outcomes: UploadOutcome[] = [
    ...processedFiles
      .filter((p) => p.status === "error")
      .map((p) => ({
        matricNumber: p.matricNumber,
        status: p.status,
        message: p.message ?? "Unknown error",
      })),
    ...processedFiles
      .filter((p) => p.status === "error" || p.status === "pending")
      .map((p) => {
        if (p.status === "pending") {
          const uploadResult = uploadResults.find((r) => r.matricNumber === p.matricNumber);
          if (!uploadResult) return null;
          if (uploadResult.status === "skipped") {
            return {
              matricNumber: uploadResult.matricNumber,
              status: "skipped" as const,
              message: uploadResult.message,
            };
          }
          if (uploadResult.status === "error") {
            return {
              matricNumber: uploadResult.matricNumber,
              status: "error" as const,
              message: uploadResult.message,
            };
          }
          return {
            matricNumber: uploadResult.matricNumber,
            status: "uploaded" as const,
            message: `Uploaded result for ${uploadResult.student?.full_name}`,
          };
        }
        return null;
      })
      .filter((o) => o !== null),
  ];

  return outcomes;
}

export async function removeUploadedResult(matricNumberInput: string): Promise<RemoveOutcome> {
  const supabase = createSupabaseServiceClient();
  const matricNumber = normalizeMatricNumber(matricNumberInput);

  const { data: result, error: resultError } = await supabase
    .from("results")
    .select("matric_number,pdf_url")
    .eq("matric_number", matricNumber)
    .maybeSingle();

  if (resultError) {
    return { success: false, matricNumber, message: resultError.message };
  }

  if (!result) {
    return {
      success: false,
      matricNumber,
      message: "No uploaded result exists for this matric number",
    };
  }

  const { error: storageError } = await supabase.storage
    .from(getStorageBucketName())
    .remove([result.pdf_url]);

  if (storageError) {
    return { success: false, matricNumber, message: storageError.message };
  }

  const { error: deleteResultError } = await supabase
    .from("results")
    .delete()
    .eq("matric_number", matricNumber);

  if (deleteResultError) {
    return { success: false, matricNumber, message: deleteResultError.message };
  }

  await supabase.from("notifications").delete().eq("matric_number", matricNumber);

  return {
    success: true,
    matricNumber,
    message: `Removed uploaded result for ${matricNumber}`,
  };
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
  const subject = "Mountain Top University | Results are out";
  const baseText = [
    "Mountain Top University",
    "Results are out",
    `Hello ${student.full_name},`,
    `Your result for ${matricNumber} is now available.`,
    `Download link: ${signedUrl}`,
  ].join("\n\n");

  const errors: string[] = [];

  for (const recipient of recipients) {
    const outcome = await sendEmailNotification({
      to: recipient,
      subject,
      text: baseText,
      html: `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a"><h1 style="margin:0 0 8px;font-size:24px;line-height:1.2;color:#052e16">Mountain Top University</h1><h2 style="margin:0 0 16px;font-size:18px;line-height:1.3;color:#166534">Results are out</h2><p>Hello ${student.full_name},</p><p>Your result for <strong>${matricNumber}</strong> is now available.</p><p><a href="${signedUrl}">Download the PDF result</a></p></div>`,
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
  if (!env.enableSmsDelivery) {
    return {
      status: "success" as const,
      errors: [] as string[],
    };
  }

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
  if (!env.enableWhatsappDelivery) {
    return {
      status: "success" as const,
      errors: [] as string[],
    };
  }

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

  // Fetch all results that need publishing
  let query = supabase.from("results").select("*").order("uploaded_at", { ascending: false });
  if (parsed.matricNumbers?.length) {
    query = query.in("matric_number", parsed.matricNumbers.map(normalizeMatricNumber));
  }

  const { data: results, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  const resultsList = (results ?? []) as ResultRecord[];

  if (resultsList.length === 0) {
    return [];
  }

  // OPTIMIZATION: Batch fetch all students in one query instead of individual queries
  const matricNumbers = resultsList.map((r) => normalizeMatricNumber(r.matric_number));
  const { data: studentsData = [] } = await supabase
    .from("students")
    .select("*")
    .in("matric_number", matricNumbers);
  const studentsByMatric = new Map(
    (studentsData as StudentRecord[]).map((s) => [normalizeMatricNumber(s.matric_number), s]),
  );

  // OPTIMIZATION: Batch fetch all latest notifications in one query
  const { data: allNotifications = [] } = await supabase
    .from("notifications")
    .select("*")
    .in("matric_number", matricNumbers)
    .order("timestamp", { ascending: false });

  const latestNotificationsByMatric = new Map<string, NotificationRecord>();
  for (const notification of allNotifications as NotificationRecord[]) {
    const matric = normalizeMatricNumber(notification.matric_number);
    if (!latestNotificationsByMatric.has(matric)) {
      latestNotificationsByMatric.set(matric, notification);
    }
  }

  // OPTIMIZATION: Batch get all signed URLs in parallel
  const signedUrlPromises = resultsList.map((result) => getSignedResultUrl(result.pdf_url));
  const signedUrls = await Promise.all(signedUrlPromises);
  const signedUrlsByPath = new Map(resultsList.map((r, i) => [r.pdf_url, signedUrls[i]]));

  // OPTIMIZATION: Process all results in parallel
  const processingPromises = resultsList.map(async (result) => {
    const matricNumber = normalizeMatricNumber(result.matric_number);
    const student = studentsByMatric.get(matricNumber);

    if (!student) {
      return {
        matricNumber,
        status: "failed" as const,
        message: "Student record is missing",
        notificationLog: {
          matricNumber,
          emailStatus: "failed",
          smsStatus: "failed",
          whatsappStatus: "failed",
          errorMessage: "Student record is missing",
        },
        resultUpdate: {
          matricNumber,
          deliveryState: "failed" as const,
          lastError: "Student record is missing",
          deliveryAttempts: result.delivery_attempts + 1,
        },
      };
    }

    if (result.delivery_state === "sent" && parsed.retryOnlyFailed) {
      return {
        matricNumber,
        status: "skipped" as const,
        message: "Already delivered successfully",
        resultUpdate: null,
        notificationLog: null,
      };
    }

    const latestNotification = latestNotificationsByMatric.get(matricNumber);
    if (
      latestNotification &&
      latestNotification.email_status === "success" &&
      latestNotification.sms_status === "success" &&
      latestNotification.whatsapp_status === "success" &&
      parsed.retryOnlyFailed
    ) {
      return {
        matricNumber,
        status: "skipped" as const,
        message: "Latest delivery already succeeded",
        resultUpdate: {
          matricNumber,
          deliveryState: "sent" as const,
          lastError: null,
          deliveryAttempts: result.delivery_attempts,
        },
        notificationLog: null,
      };
    }

    try {
      const signedUrl = signedUrlsByPath.get(result.pdf_url) || "";

      // Send all notifications in parallel for this result
      const [emailBundle, smsBundle, whatsappBundle] = await Promise.all([
        sendEmailBundle(student, signedUrl, matricNumber),
        sendSmsBundle(student, signedUrl, matricNumber),
        sendWhatsAppBundle(student, signedUrl, matricNumber),
      ]);

      const emailStatus = emailBundle.status;
      const smsStatus = smsBundle.status;
      const whatsappStatus = whatsappBundle.status;
      const errors = [...emailBundle.errors, ...smsBundle.errors, ...whatsappBundle.errors];
      const successfulChannels = [emailStatus, smsStatus, whatsappStatus].filter(
        (status) => status === "success",
      ).length;

      const deliveryState: "sent" | "partial" | "failed" =
        successfulChannels === 3 ? "sent" : successfulChannels > 0 ? "partial" : "failed";

      const status: "sent" | "failed" = deliveryState === "failed" ? "failed" : "sent";
      const message =
        status === "sent"
          ? errors.length === 0
            ? "Distribution completed"
            : `Distribution completed with some channel failures: ${errors.join(" | ")}`
          : errors.join(" | ");

      return {
        matricNumber,
        status,
        message,
        notificationLog: {
          matricNumber,
          emailStatus,
          smsStatus,
          whatsappStatus,
          errorMessage: errors.length > 0 ? errors.join(" | ") : null,
        },
        resultUpdate: {
          matricNumber,
          deliveryState,
          lastError: errors.length > 0 ? errors.join(" | ") : null,
          deliveryAttempts: result.delivery_attempts + 1,
        },
      };
    } catch (publishError) {
      const message = publishError instanceof Error ? publishError.message : "Distribution failed";

      return {
        matricNumber,
        status: "failed" as const,
        message,
        notificationLog: {
          matricNumber,
          emailStatus: "failed",
          smsStatus: "failed",
          whatsappStatus: "failed",
          errorMessage: message,
        },
        resultUpdate: {
          matricNumber,
          deliveryState: "failed" as const,
          lastError: message,
          deliveryAttempts: result.delivery_attempts + 1,
        },
      };
    }
  });

  const outcomes = await Promise.all(processingPromises);

  // OPTIMIZATION: Batch all database writes at the end
  const logsToInsert = outcomes
    .map((o) => o.notificationLog)
    .filter((log) => log !== null) as Array<{
    matricNumber: string;
    emailStatus: string;
    smsStatus: string;
    whatsappStatus: string;
    errorMessage: string | null;
  }>;

  if (logsToInsert.length > 0) {
    const now = new Date().toISOString();
    await supabase.from("notifications").insert(
      logsToInsert.map((log) => ({
        ...log,
        timestamp: now,
      })),
    );
  }

  // Batch update all results
  const resultUpdates = outcomes
    .map((o) => o.resultUpdate)
    .filter((update) => update !== null) as Array<{
    matricNumber: string;
    deliveryState: string;
    lastError: string | null;
    deliveryAttempts: number;
  }>;

  // Use individual updates in parallel since Supabase doesn't have batch update
  if (resultUpdates.length > 0) {
    const now = new Date().toISOString();
    await Promise.all(
      resultUpdates.map((update) =>
        supabase
          .from("results")
          .update({
            delivery_state: update.deliveryState,
            published_at:
              update.deliveryState === "sent" || update.deliveryState === "partial"
                ? now
                : null,
            last_error: update.lastError,
            delivery_attempts: update.deliveryAttempts,
            updated_at: now,
          })
          .eq("matric_number", update.matricNumber),
      ),
    );
  }

  // Return outcomes without internal details
  return outcomes.map((o) => ({
    matricNumber: o.matricNumber,
    status: o.status,
    message: o.message,
  }));
}

export async function getDashboardSnapshot() {
  const supabase = createSupabaseServiceClient();

  const [studentsResult, resultsResult, logsResult, adminLogsResult] = await Promise.all([
    supabase.from("students").select("*").order("created_at", { ascending: false }),
    supabase.from("results").select("*").order("uploaded_at", { ascending: false }),
    supabase.from("notifications").select("*").order("timestamp", { ascending: false }),
    supabase.from("admin_logs").select("*").order("created_at", { ascending: false }),
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

  if (adminLogsResult.error) {
    throw new Error(adminLogsResult.error.message);
  }

  const students = (studentsResult.data ?? []) as StudentRecord[];
  const results = (resultsResult.data ?? []) as ResultRecord[];
  const logs = (logsResult.data ?? []) as NotificationRecord[];
  const adminLogs = (adminLogsResult.data ?? []) as AdminLogRecord[];

  const stats: DashboardStats = {
    studentCount: students.length,
    resultCount: results.length,
    publishedCount: results.filter((item) => item.delivery_state === "sent").length,
    pendingCount: results.filter((item) => item.delivery_state === "pending").length,
    // Count logs where at least one channel failed (more accurate)
    failedDeliveries: logs.filter(
      (item) =>
        item.email_status === "failed" ||
        item.sms_status === "failed" ||
        item.whatsapp_status === "failed",
    ).length,
    // Count only fully successful deliveries where all channels succeeded
    successfulDeliveries: logs.filter(
      (item) =>
        item.email_status === "success" &&
        item.sms_status === "success" &&
        item.whatsapp_status === "success",
    ).length,
    // Count partial: at least one success AND at least one failure
    partialDeliveries: logs.filter(
      (item) => {
        const statuses = [item.email_status, item.sms_status, item.whatsapp_status];
        const hasSuccess = statuses.includes("success");
        const hasFailure = statuses.includes("failed");
        return hasSuccess && hasFailure;
      },
    ).length,
  };

  return { students, results, logs, adminLogs, stats };
}
