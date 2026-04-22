import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Admin Access | SRDS",
  description: "Dedicated route for administrator sign-in and dashboard entry.",
};

export default function AdminAccessPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl items-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="grid w-full gap-8 rounded-4xl border border-white/70 bg-white/90 p-8 shadow-[0_40px_120px_-60px_rgba(15,23,42,0.6)] backdrop-blur lg:grid-cols-[1fr_auto] lg:items-end">
        <section className="grid gap-4">
          <p className="inline-flex w-fit rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-emerald-800">
            Admin access route
          </p>
          <h1 className="text-4xl font-semibold leading-tight text-slate-950 sm:text-5xl">
            Administrator portal is separated from student registration.
          </h1>
          <p className="max-w-2xl text-base leading-7 text-slate-600">
            Use this route for secure admin sign-in before uploading PDFs, publishing results, and reviewing delivery logs.
          </p>
        </section>

        <Link
          href="/admin/login"
          className="inline-flex rounded-full bg-emerald-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800"
        >
          Continue to Admin Login
        </Link>
      </div>
    </main>
  );
}
