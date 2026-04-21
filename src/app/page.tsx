import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl items-center px-4 py-10 sm:px-6 lg:px-8">
      <div className="grid w-full gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="panel grid gap-6 rounded-4xl p-8 lg:p-10">
          <div className="inline-flex w-fit rounded-full border border-cyan-200 bg-cyan-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-cyan-800">
            Student Result Distribution System
          </div>

          <div className="grid gap-5">
            <h1 className="max-w-3xl text-4xl font-semibold leading-[1.05] tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
              Publish matched result PDFs to students, parents, email, SMS, and WhatsApp in one flow.
            </h1>
            <p className="max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">
              Student registration is keyed by matric number, PDFs are matched automatically from Supabase Storage,
              and the system logs every delivery attempt for safe retry and auditability.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/register"
              className="rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold !text-white transition hover:bg-slate-800"
            >
              Register A Student
            </Link>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <FeatureCard title="Unique identifier" text="Matric number is the primary key for upload and delivery matching." />
            <FeatureCard title="Multi-channel delivery" text="Email, SMS, and WhatsApp notifications use one publish action." />
            <FeatureCard title="Delivery tracking" text="Every send attempt is logged with success and failure details." />
          </div>
        </section>

        <aside className="grid gap-6">
          <div className="panel rounded-4xl p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Workflow</p>
            <ol className="mt-4 grid gap-4 text-sm leading-6 text-slate-700">
              <li>1. Student registers with contact details and a unique matric number.</li>
              <li>2. Admin uploads PDFs named exactly as matric_number.pdf.</li>
              <li>3. The system matches records, signs a download link, and publishes delivery logs.</li>
            </ol>
          </div>

          <div className="grid gap-4 rounded-4xl border border-slate-200 bg-slate-950 p-8 text-white shadow-[0_30px_80px_-50px_rgba(15,23,42,0.7)]">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Admin portal</p>
              <p className="mt-3 text-2xl font-semibold">Use a separate route for admin access</p>
            </div>
            <p className="text-sm leading-6 text-slate-300">
              Admin sign-in is now separated from student access.
            </p>
            <Link
              href="/admin-access"
              className="inline-flex w-fit rounded-full border border-slate-400 px-5 py-2.5 text-sm font-semibold text-white transition hover:border-white hover:bg-white/10"
            >
              Go to Admin Access
            </Link>
          </div>
        </aside>
      </div>
    </main>
  );
}

function FeatureCard({ title, text }: { title: string; text: string }) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-4 shadow-[0_25px_60px_-45px_rgba(15,23,42,0.35)]">
      <h2 className="text-sm font-semibold text-slate-950">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
    </article>
  );
}
