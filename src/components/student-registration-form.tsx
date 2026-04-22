"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

const initialFormState = {
  fullName: "",
  matricNumber: "",
  email: "",
  mtuEmail: "",
  phoneNumber: "",
  parentEmail: "",
  parentPhone: "",
};

export function StudentRegistrationForm() {
  const router = useRouter();
  const [formState, setFormState] = useState(initialFormState);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = event.target;
    setFormState((current) => ({ ...current, [name]: value }));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorStatus(null);

    startTransition(async () => {
      const response = await fetch("/api/register-student", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formState),
      });

      const payload = (await response.json().catch(() => ({}))) as {
        message?: string;
        student?: { matricNumber?: string };
      };

      if (!response.ok) {
        setErrorStatus(payload.message ?? "Registration failed");
        return;
      }

      // Redirect to success page
      router.push("/register/success");
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid gap-4 rounded-4xl border border-white/60 bg-white/90 p-6 shadow-[0_40px_90px_-55px_rgba(13,37,63,0.45)] backdrop-blur"
    >
      <div className="grid gap-1">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
          Student registration
        </p>
        <h2 className="text-2xl font-semibold text-slate-950">Submit your details once</h2>
        <p className="text-sm leading-6 text-slate-600">
          Matric number is the primary identifier used to match PDFs to the correct student.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Full name" name="fullName" value={formState.fullName} onChange={handleChange} />
        <Field label="Matric number" name="matricNumber" value={formState.matricNumber} onChange={handleChange} />
        <Field label="Personal email" name="email" type="email" value={formState.email} onChange={handleChange} />
        <Field label="MTU email" name="mtuEmail" type="email" value={formState.mtuEmail} onChange={handleChange} />
        <Field label="Phone number" name="phoneNumber" value={formState.phoneNumber} onChange={handleChange} />
        <Field label="Parent email" name="parentEmail" type="email" value={formState.parentEmail} onChange={handleChange} />
        <Field label="Parent phone number" name="parentPhone" value={formState.parentPhone} onChange={handleChange} />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center justify-center rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "Saving..." : "Register student"}
        </button>
        {errorStatus ? <p className="text-sm font-medium text-rose-700">{errorStatus}</p> : null}
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
