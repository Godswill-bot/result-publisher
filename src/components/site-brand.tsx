import Image from "next/image";

export function SiteBrand() {
  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-brand/25 bg-white/85 backdrop-blur">
      <div className="mx-auto flex w-full max-w-7xl items-center px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <Image
            src="/mtu-logo.png"
            alt="Mountain Top University logo"
            width={48}
            height={48}
            className="h-10 w-10 rounded-md border border-brand-soft/70 bg-white object-contain p-1 sm:h-11 sm:w-11"
            priority
          />
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand sm:text-sm">
            Mountain top university
          </p>
        </div>
      </div>
    </header>
  );
}