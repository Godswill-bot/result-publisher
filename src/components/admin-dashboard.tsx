"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import type { AdminLogRecord, DashboardStats, NotificationRecord, ResultRecord, StudentRecord } from "@/lib/types";

type AdminDashboardProps = {
  adminEmail: string;
  students: StudentRecord[];
  results: ResultRecord[];
  logs: NotificationRecord[];
  adminLogs: AdminLogRecord[];
  stats: DashboardStats;
};

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function badgeClass(status: string) {
  if (status === "sent" || status === "success") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (status === "pending") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  if (status === "partial") {
    return "border-orange-200 bg-orange-50 text-orange-700";
  }

  return "border-rose-200 bg-rose-50 text-rose-700";
}

function messageClass(value: string) {
  if (/error|failed|missing/i.test(value)) {
    return "text-rose-700";
  }

  return "text-emerald-700";
}

export function AdminDashboard({ adminEmail, students, results, logs, adminLogs, stats }: AdminDashboardProps) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [isUploading, startUploadTransition] = useTransition();
  const [isPublishing, startPublishTransition] = useTransition();
  const [isRemovingResult, startRemoveResultTransition] = useTransition();
  const [isLoggingOut, startLogoutTransition] = useTransition();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [showNotificationLogs, setShowNotificationLogs] = useState(false);
  const [showAdminLogs, setShowAdminLogs] = useState(false);

  const recentLogs = useMemo(() => logs.slice(0, 8), [logs]);
  const recentAdminLogs = useMemo(() => adminLogs.slice(0, 8), [adminLogs]);
  const recentResults = useMemo(() => results.slice(0, 10), [results]);

  function handleUpload() {
    if (selectedFiles.length === 0) {
      setUploadError("Select one or more PDF files before uploading.");
      return;
    }

    setUploadError(null);
    setMessage(null);

    startUploadTransition(async () => {
      const formData = new FormData();
      for (const file of selectedFiles) {
        formData.append("files", file);
      }

      const response = await fetch("/api/results/upload", {
        method: "POST",
        body: formData,
      });

      const payload = (await response.json().catch(() => ({}))) as {
        message?: string;
        outcomes?: Array<{ matricNumber: string; status: string; message: string }>;
      };

      if (!response.ok) {
        setUploadError(payload.message ?? "Upload failed");
        return;
      }

      const summary =
        payload.outcomes
          ?.map((outcome) => `${outcome.matricNumber}: ${outcome.status} (${outcome.message})`)
          .join(" | ") ??
        "Upload completed";
      setMessage(summary);
      setSelectedFiles([]);
      router.refresh();
    });
  }

  function handlePublish() {
    setPublishError(null);
    setMessage(null);

    startPublishTransition(async () => {
      const response = await fetch("/api/results/publish", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ retryOnlyFailed: true }),
      });

      const payload = (await response.json().catch(() => ({}))) as {
        message?: string;
        outcomes?: Array<{ matricNumber: string; status: string; message: string }>;
      };

      if (!response.ok) {
        setPublishError(payload.message ?? "Publish failed");
        return;
      }

      const summary =
        payload.outcomes
          ?.map((outcome) => `${outcome.matricNumber}: ${outcome.status} (${outcome.message})`)
          .join(" | ") ??
        "Publish completed";
      setMessage(summary);
      router.refresh();
    });
  }

  function handleRemoveSelectedFile(name: string) {
    setSelectedFiles((current) => current.filter((file) => file.name !== name));
  }

  function handleClearSelectedFiles() {
    setSelectedFiles([]);
  }

  function handleRemoveUploadedResult(matricNumber: string) {
    setRemoveError(null);
    setMessage(null);

    startRemoveResultTransition(async () => {
      const response = await fetch("/api/results/remove", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ matricNumber }),
      });

      const payload = (await response.json().catch(() => ({}))) as { message?: string };

      if (!response.ok) {
        setRemoveError(payload.message ?? "Could not remove uploaded result");
        return;
      }

      setMessage(payload.message ?? `Removed uploaded result for ${matricNumber}`);
      router.refresh();
    });
  }

  function handleLogout() {
    startLogoutTransition(async () => {
      await fetch("/api/admin/logout", { method: "POST" });
      router.push("/admin/login");
      router.refresh();
    });
  }

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-4 rounded-4xl border border-white/60 bg-slate-950 p-6 text-white shadow-[0_40px_100px_-50px_rgba(15,23,42,0.65)] lg:flex-row lg:items-end lg:justify-between">
        <div className="grid gap-2">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-300">Admin dashboard</p>
          <h1 className="text-3xl font-semibold">Student result distribution control room</h1>
          <p className="max-w-2xl text-sm leading-6 text-slate-300">
            Signed in as {adminEmail}. Upload PDFs named by matric number, review matched records, and publish delivery logs.
          </p>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="inline-flex items-center justify-center rounded-full border border-white/15 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoggingOut ? "Signing out..." : "Sign out"}
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <StatCard label="Registered students" value={stats.studentCount} accent="from-cyan-500 to-blue-500" />
        <StatCard label="Uploaded results" value={stats.resultCount} accent="from-slate-900 to-slate-700" />
        <StatCard label="Published results" value={stats.publishedCount} accent="from-emerald-500 to-teal-500" />
        <StatCard label="Pending deliveries" value={stats.pendingCount} accent="from-amber-500 to-orange-500" />
        <StatCard label="Successful deliveries" value={stats.successfulDeliveries} accent="from-green-500 to-emerald-500" />
        <StatCard label="Failed logs" value={stats.failedDeliveries} accent="from-rose-500 to-red-500" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="grid gap-4 rounded-4xl border border-white/70 bg-white/90 p-6 shadow-[0_40px_90px_-60px_rgba(15,23,42,0.35)] backdrop-blur">
          <div className="grid gap-1">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Bulk upload</p>
            <h2 className="text-2xl font-semibold text-slate-950">Upload PDF results</h2>
            <p className="text-sm leading-6 text-slate-600">
              Every file must be named exactly as <strong>matric_number.pdf</strong> so the system can match it to a student.
            </p>
          </div>

          <div className="grid gap-3 rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-5">
            <input
              type="file"
              accept="application/pdf"
              multiple
              title="Select one or more PDF result files"
              onChange={(event) => setSelectedFiles(Array.from(event.target.files ?? []))}
              className="block w-full cursor-pointer text-sm text-slate-700 file:mr-4 file:rounded-full file:border-0 file:bg-slate-950 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-slate-800"
            />
            <div className="flex flex-wrap gap-2 text-xs text-slate-500">
              {selectedFiles.length === 0 ? (
                <span>No files selected</span>
              ) : (
                selectedFiles.map((file) => (
                  <span key={file.name} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1">
                    <span>{file.name}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveSelectedFile(file.name)}
                      className="rounded-full border border-slate-300 px-2 py-0.5 text-[10px] font-semibold text-slate-600 transition hover:bg-slate-100"
                    >
                      Remove
                    </button>
                  </span>
                ))
              )}
            </div>
            {selectedFiles.length > 0 ? (
              <button
                type="button"
                onClick={handleClearSelectedFiles}
                className="inline-flex w-fit rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                Clear selected files
              </button>
            ) : null}
            <button
              type="button"
              onClick={handleUpload}
              disabled={isUploading}
              className="inline-flex items-center justify-center rounded-full bg-cyan-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isUploading ? "Uploading..." : "Match PDF's"}
            </button>
            {uploadError ? <p className="text-sm font-medium text-rose-600">{uploadError}</p> : null}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handlePublish}
              disabled={isPublishing}
              className="inline-flex items-center justify-center rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPublishing ? "Publishing..." : "Publish results"}
            </button>
            <p className="text-sm text-slate-500">
              Result links are signed and expire automatically after seven days.
            </p>
          </div>

          {publishError ? <p className="text-sm font-medium text-rose-600">{publishError}</p> : null}
          {removeError ? <p className="text-sm font-medium text-rose-600">{removeError}</p> : null}
          {message ? <p className={`text-sm font-medium ${messageClass(message)}`}>{message}</p> : null}
        </section>

        <section className="grid gap-4 rounded-4xl border border-white/70 bg-white/90 p-6 shadow-[0_40px_90px_-60px_rgba(15,23,42,0.35)] backdrop-blur">
          <div className="flex items-center justify-between gap-3">
            <div className="grid gap-1">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Delivery health</p>
              <h2 className="text-2xl font-semibold text-slate-950">Recent notifications</h2>
            </div>
            <button
              onClick={() => setShowNotificationLogs(!showNotificationLogs)}
              className="rounded-full border border-slate-200 bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 transition-colors"
            >
              {showNotificationLogs ? "Hide" : "Show"}
            </button>
          </div>

          {showNotificationLogs && (
            <div className="grid gap-3">
              {recentLogs.length === 0 ? (
                <p className="text-sm text-slate-500">No delivery logs yet.</p>
              ) : (
                recentLogs.map((log) => (
                  <article key={log.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-950">{log.matric_number}</p>
                        <p className="text-xs text-slate-500">{formatDate(log.timestamp)}</p>
                      </div>
                      <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${badgeClass(log.email_status)}`}>
                        Email {log.email_status}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs font-medium">
                      <span className={`rounded-full border px-2.5 py-1 ${badgeClass(log.sms_status)}`}>SMS {log.sms_status}</span>
                      <span className={`rounded-full border px-2.5 py-1 ${badgeClass(log.whatsapp_status)}`}>WhatsApp {log.whatsapp_status}</span>
                    </div>
                    {log.error_message ? <p className="mt-3 text-sm text-slate-600">{log.error_message}</p> : null}
                  </article>
                ))
              )}
            </div>
          )}
        </section>
      </div>

      <section className="grid gap-4 rounded-4xl border border-white/70 bg-white/90 p-6 shadow-[0_40px_90px_-60px_rgba(15,23,42,0.35)] backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <div className="grid gap-1">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Admin logs</p>
            <h2 className="text-2xl font-semibold text-slate-950">Recent admin activity</h2>
          </div>
          <button
            onClick={() => setShowAdminLogs(!showAdminLogs)}
            className="rounded-full border border-slate-200 bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 transition-colors"
          >
            {showAdminLogs ? "Hide" : "Show"}
          </button>
        </div>

        {showAdminLogs && (
          <div className="grid gap-3">
            {recentAdminLogs.length === 0 ? (
              <p className="text-sm text-slate-500">No admin activity logged yet.</p>
            ) : (
              recentAdminLogs.map((log) => (
                <article key={log.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-950">{log.action.replace(/_/g, " ")}</p>
                      <p className="text-xs text-slate-500">{formatDate(log.created_at)}</p>
                    </div>
                    <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${badgeClass(log.status)}`}>
                      {log.status}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">Admin: {log.admin_email}</p>
                  {log.target ? <p className="mt-1 text-sm text-slate-600">Target: {log.target}</p> : null}
                  {log.detail ? <p className="mt-1 text-sm text-slate-600">{log.detail}</p> : null}
                </article>
              ))
            )}
          </div>
        )}
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-4xl border border-white/70 bg-white/90 p-6 shadow-[0_40px_90px_-60px_rgba(15,23,42,0.35)] backdrop-blur">
          <div className="grid gap-1">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Students</p>
            <h2 className="text-2xl font-semibold text-slate-950">Registered records</h2>
          </div>
          <div className="mt-5 overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="text-left text-slate-500">
                <tr>
                  <th className="py-3 pr-4">Name</th>
                  <th className="py-3 pr-4">Matric</th>
                  <th className="py-3 pr-4">Personal email</th>
                  <th className="py-3 pr-4">Parent phone</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {students.map((student) => (
                  <tr key={student.id}>
                    <td className="py-3 pr-4 font-medium text-slate-950">{student.full_name}</td>
                    <td className="py-3 pr-4">{student.matric_number}</td>
                    <td className="py-3 pr-4">{student.email}</td>
                    <td className="py-3 pr-4">{student.parent_phone}</td>
                  </tr>
                ))}
                {students.length === 0 ? (
                  <tr>
                    <td className="py-4 text-slate-500" colSpan={4}>
                      No student records yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-4xl border border-white/70 bg-white/90 p-6 shadow-[0_40px_90px_-60px_rgba(15,23,42,0.35)] backdrop-blur">
          <div className="grid gap-1">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Results</p>
            <h2 className="text-2xl font-semibold text-slate-950">Uploaded PDFs</h2>
          </div>
          <div className="mt-5 overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="text-left text-slate-500">
                <tr>
                  <th className="py-3 pr-4">Matric</th>
                  <th className="py-3 pr-4">State</th>
                  <th className="py-3 pr-4">Uploaded</th>
                  <th className="py-3 pr-4">Published</th>
                  <th className="py-3 pr-4">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {recentResults.map((result) => (
                  <tr key={result.id}>
                    <td className="py-3 pr-4 font-medium text-slate-950">{result.matric_number}</td>
                    <td className="py-3 pr-4">
                      <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${badgeClass(result.delivery_state)}`}>
                        {result.delivery_state}
                      </span>
                    </td>
                    <td className="py-3 pr-4">{formatDate(result.uploaded_at)}</td>
                    <td className="py-3 pr-4">{formatDate(result.published_at)}</td>
                    <td className="py-3 pr-4">
                      <button
                        type="button"
                        disabled={isRemovingResult}
                        onClick={() => handleRemoveUploadedResult(result.matric_number)}
                        className="inline-flex items-center justify-center rounded-full border border-rose-300 px-3 py-1 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isRemovingResult ? "Removing..." : "Remove"}
                      </button>
                    </td>
                  </tr>
                ))}
                {recentResults.length === 0 ? (
                  <tr>
                    <td className="py-4 text-slate-500" colSpan={5}>
                      No results have been uploaded yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className="rounded-4xl border border-white/70 bg-white/90 p-5 shadow-[0_30px_80px_-55px_rgba(15,23,42,0.35)] backdrop-blur">
      <div className={`h-1.5 w-16 rounded-full bg-linear-to-r ${accent}`} />
      <p className="mt-4 text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-slate-950">{value}</p>
    </div>
  );
}
