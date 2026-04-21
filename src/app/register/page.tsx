import type { Metadata } from "next";

import { StudentRegistrationForm } from "@/components/student-registration-form";

export const metadata: Metadata = {
  title: "Student Registration | SRDS",
  description: "Register student and parent contact details for automatic result delivery.",
};

export default function RegisterPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl items-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="grid w-full gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
        <section className="grid gap-6 rounded-4xl border border-white/60 bg-slate-950 p-8 text-white shadow-[0_40px_120px_-60px_rgba(15,23,42,0.8)]">
          <div className="inline-flex w-fit rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-200">
            Student portal
          </div>
          <div className="grid gap-4">
            <h1 className="max-w-lg text-4xl font-semibold leading-tight sm:text-5xl">
              Register once. Receive every result automatically.
            </h1>
            <p className="max-w-xl text-base leading-7 text-slate-300">
              The matric number is the primary identifier. Once the admin uploads a matching PDF,
              the system distributes the result to the student and parent contact points.
            </p>
          </div>
          <div className="grid gap-3 text-sm text-slate-300">
            <p>• Personal email, MTU email, phone, and parent contact details are stored securely.</p>
            <p>• Uploaded PDFs are matched against matric numbers before delivery.</p>
            <p>• Failed deliveries are logged for safe retry.</p>
          </div>
        </section>

        <StudentRegistrationForm />
      </div>
    </main>
  );
}
