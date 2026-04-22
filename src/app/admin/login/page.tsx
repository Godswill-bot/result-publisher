import type { Metadata } from "next";

import { AdminLoginForm } from "@/components/admin-login-form";

export const metadata: Metadata = {
  title: "Admin Login | SRDS",
  description: "Admin authentication for result uploads and publishing.",
};

export default function AdminLoginPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl items-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="grid w-full gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
        <section className="grid gap-6 rounded-4xl border border-white/60 bg-emerald-950 p-8 text-white shadow-[0_40px_120px_-60px_rgba(6,78,59,0.75)]">
          <div className="inline-flex w-fit rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-emerald-100">
            Admin access
          </div>
          <div className="grid gap-4">
            <h1 className="max-w-lg text-4xl font-semibold leading-tight sm:text-5xl">
              Publish results without manual file chasing.
            </h1>
            <p className="max-w-xl text-base leading-7 text-emerald-100/85">
              Authenticate with the Supabase admin record to manage students, uploads, delivery logs,
              and result publishing from one protected workspace.
            </p>
          </div>
        </section>

        <AdminLoginForm />
      </div>
    </main>
  );
}
