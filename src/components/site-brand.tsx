import Image from "next/image";

export function SiteBrand() {
  return (
    <div className="fixed right-4 top-4 z-40 sm:right-6 sm:top-6 lg:right-8">
      <div className="panel flex items-center gap-3 rounded-2xl border-brand/35 px-3 py-2 sm:px-4">
        <p className="text-right text-xs font-semibold uppercase tracking-[0.22em] text-brand sm:text-sm">
          Mountain top university
        </p>
        <Image
          src="/mtu-logo.png"
          alt="Mountain Top University logo"
          width={48}
          height={48}
          className="h-11 w-11 rounded-md border border-brand-soft/70 bg-white object-contain p-1 sm:h-12 sm:w-12"
          priority
        />
      </div>
    </div>
  );
}