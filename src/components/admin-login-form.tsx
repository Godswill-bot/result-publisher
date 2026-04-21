"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

const initialFormState = {
  email: "",
  password: "",
};

export function AdminLoginForm() {
  const router = useRouter();
  const [formState, setFormState] = useState(initialFormState);
  const [status, setStatus] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = event.target;
    setFormState((current) => ({ ...current, [name]: value }));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus(null);

    startTransition(async () => {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formState),
      });

      const payload = (await response.json().catch(() => ({}))) as { message?: string };

      if (!response.ok) {
        setStatus(payload.message ?? "Login failed");
        return;
      }

      setStatus("Login successful. Redirecting to the dashboard...");
      router.push("/admin");
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid gap-4 rounded-4xl border border-white/60 bg-white/90 p-6 shadow-[0_40px_90px_-55px_rgba(13,37,63,0.45)] backdrop-blur"
    >
      <div className="grid gap-1">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Admin access</p>
        <h1 className="text-2xl font-semibold text-slate-950">Secure dashboard login</h1>
        <p className="text-sm leading-6 text-slate-600">
          Use the admin record stored in Supabase to unlock uploads, publishing, and logs.
        </p>
      </div>

      <Field label="Admin email" name="email" type="email" value={formState.email} onChange={handleChange} />
      <Field label="Password" name="password" type="password" value={formState.password} onChange={handleChange} />

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center justify-center rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold !text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "Checking..." : "Sign in"}
        </button>
        {status ? <p className="text-sm font-medium text-slate-700">{status}</p> : null}
      </div>
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  value,
  onChange,
}: {
  label: string;
  name: string;
  type?: string;
  value: string;
  onChange: React.ChangeEventHandler<HTMLInputElement>;
}) {
  return (
    <label className="grid gap-2 text-sm font-medium text-slate-700">
      <span>{label}</span>
      <input
        required
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-cyan-400 focus:bg-white focus:ring-4 focus:ring-cyan-100"
      />
    </label>
  );
}
