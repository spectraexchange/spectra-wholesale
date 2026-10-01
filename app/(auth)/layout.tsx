import Image from "next/image";
import { MidnightSunScene } from "@/components/midnight-sun-scene";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative isolate flex min-h-dvh flex-col bg-night lg:flex-row lg:items-center">
      <MidnightSunScene className="absolute inset-0 -z-20 h-full w-full" />
      {/* Darkens the foreground so the tagline reads cleanly */}
      <div className="absolute inset-x-0 bottom-0 -z-10 h-[55%] bg-gradient-to-t from-night via-night/60 to-transparent" />

      <div className="flex flex-1 flex-col justify-between gap-10 px-6 pt-8 pb-10 sm:px-10 lg:min-h-dvh lg:py-12 lg:pl-16">
        <Image
          src="/spectra-logo.png"
          alt="Spectra Wholesale"
          width={1774}
          height={887}
          priority
          className="h-auto w-44 drop-shadow-[0_6px_18px_rgba(0,0,0,0.35)] sm:w-56"
        />

        <div className="hidden max-w-md lg:block">
          <p className="font-display text-[2.6rem] leading-[1.08] font-light tracking-tight text-paper [text-shadow:0_2px_24px_rgba(15,30,37,0.55)]">
            Alaska&rsquo;s licensed cannabis wholesale marketplace.
          </p>
          <p className="mt-5 font-mono text-[11px] tracking-[0.2em] text-paper/75 uppercase">
            Retailers &middot; Cultivators &middot; Processors
          </p>
        </div>
      </div>

      <div className="px-4 pb-6 sm:px-10 lg:w-[480px] lg:shrink-0 lg:py-12 lg:pr-16 lg:pl-0">
        <div className="rounded-md bg-paper p-8 shadow-[8px_8px_0_0_var(--teal)] sm:p-10">
          {children}
        </div>
      </div>
    </main>
  );
}
