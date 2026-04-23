import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl items-center px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto grid w-full max-w-4xl gap-6">
        <section className="panel grid gap-6 rounded-4xl p-8 lg:p-10">
          <div className="inline-flex w-fit rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-emerald-800">
            Student Result Distribution System
          </div>

          <div className="grid gap-5">
            <h1 className="max-w-3xl text-4xl font-semibold leading-[1.05] tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
              Upload matched result PDFs to students, parents, email, SMS, and WhatsApp in one flow.
            </h1>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/register"
              className="rounded-full bg-emerald-900 px-6 py-3 text-sm font-semibold text-white! transition hover:bg-emerald-800"
            >
              Register A Student
            </Link>
          </div>

          
        </section>

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
