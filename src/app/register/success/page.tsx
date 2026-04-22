import Link from "next/link";

export const metadata = {
  title: "Registration Successful | SRDS",
  description: "Your student registration was successful. Results will be sent to your contact details.",
};

export default function RegistrationSuccessPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
      <div className="w-full">
        <section className="grid gap-8 rounded-4xl border border-white/60 bg-white/90 p-6 shadow-[0_40px_90px_-55px_rgba(13,37,63,0.45)] backdrop-blur sm:p-10">
          {/* Success Icon */}
          <div className="flex justify-center">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-emerald-100 ring-4 ring-emerald-200">
              <svg
                className="h-12 w-12 text-emerald-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
          </div>

          {/* Heading and Description */}
          <div className="grid gap-4 text-center">
            <h1 className="text-4xl font-semibold text-slate-950 sm:text-5xl">
              Successfully Registered!
            </h1>
            <p className="text-lg leading-relaxed text-slate-600">
              Thank you for registering. Your details have been saved successfully.
            </p>
          </div>

          {/* Key Points */}
          <div className="grid gap-4 rounded-3xl bg-emerald-50 px-6 py-6 md:grid-cols-2">
            <div className="flex gap-3">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-200">
                <svg className="h-4 w-4 text-emerald-700" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-emerald-900">Results via Email</p>
                <p className="text-sm text-emerald-800">Sent to your personal & MTU email</p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-200">
                <svg className="h-4 w-4 text-emerald-700" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-emerald-900">SMS & WhatsApp</p>
                <p className="text-sm text-emerald-800">Sent to your phone number</p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-200">
                <svg className="h-4 w-4 text-emerald-700" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-emerald-900">Parent Notifications</p>
                <p className="text-sm text-emerald-800">Your parent email & phone included</p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-200">
                <svg className="h-4 w-4 text-emerald-700" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-emerald-900">Secure Delivery</p>
                <p className="text-sm text-emerald-800">Matched by matric number</p>
              </div>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/"
              className="rounded-full bg-emerald-900 px-8 py-4 text-center text-base font-semibold text-white transition hover:bg-emerald-800"
            >
              Return to Home
            </Link>
            <Link
              href="/register"
              className="rounded-full border border-slate-200 px-8 py-4 text-center text-base font-semibold text-slate-900 transition hover:bg-slate-50"
            >
              Register Another Student
            </Link>
          </div>

          {/* Footer Note */}
          <div className="rounded-2xl bg-blue-50 px-4 py-3 text-sm text-blue-900 border border-blue-200">
            <p>
              <strong>Note:</strong> Make sure to keep your contact details updated. Results will be sent once published by the administration.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
