import Image from "next/image";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { requireSuperAdmin } from "@/lib/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireSuperAdmin();

  return (
    <div className="min-h-dvh">
      <header className="bg-night text-cream">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link href="/admin/access-requests" className="flex items-center gap-4">
            <Image src="/spectra-logo.png" alt="Spectra Wholesale" width={1774} height={887} className="h-auto w-24" />
            <span className="font-mono text-[11px] tracking-[0.2em] text-cream/60 uppercase">Admin</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-sm text-cream/70 transition-colors hover:text-cream">
              Dashboard
            </Link>
            <ThemeToggle className="text-cream/80 hover:text-cream" />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-12">{children}</main>
    </div>
  );
}
