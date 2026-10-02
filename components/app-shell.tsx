import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { readViewAs } from "@/lib/view-as";
import { NavLinks, type NavItem } from "./nav-links";
import { ThemeToggle } from "./theme-toggle";

async function signOut() {
  "use server";
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login?message=signed-out");
}

// Dark `night` bar over a themed (cream / night-mode) content area.
export async function AppShell({
  nav,
  home,
  context,
  userName,
  children,
}: {
  nav: NavItem[];
  home: string;
  context: string; // company name, or "Admin"
  userName: string;
  children: React.ReactNode;
}) {
  const viewAs = await readViewAs();

  return (
    <div className="flex min-h-dvh flex-col">
      {/* Banner + nav stick together so the banner can wrap on small screens */}
      <div className="sticky top-0 z-20 print:hidden">
        {viewAs && (
          <div role="status" className="bg-amber text-[#1b1813]">
            <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-1 px-6 py-2 text-[13px]">
              <p>
                <span className="font-mono text-[11px] tracking-[0.16em] uppercase">Viewing as</span>{" "}
                <strong className="font-semibold">{viewAs.targetName}</strong> ({viewAs.companyName}). Anything you do here is done as them.
              </p>
              {/* A plain link: the exit route swaps the session back to the admin */}
              <a href="/auth/exit-view-as" className="font-semibold underline underline-offset-4 hover:no-underline">
                Exit to admin &rarr;
              </a>
            </div>
          </div>
        )}
        <header className="bg-night text-cream">
          <div className="mx-auto flex max-w-6xl items-center gap-8 px-6">
            <Link href={home} className="shrink-0 py-3">
              <Image src="/spectra-logo.png" alt="Spectra Wholesale" width={1774} height={887} priority className="h-auto w-24" />
            </Link>

            <NavLinks items={nav} className="hidden md:flex" />

            <div className="ml-auto flex items-center gap-1">
              <div className="mr-3 hidden text-right leading-tight lg:block">
                <p className="text-[13px] text-cream">{userName}</p>
                <p className="font-mono text-[10px] tracking-[0.16em] text-cream/55 uppercase">{context}</p>
              </div>
              <ThemeToggle className="text-cream/80 hover:text-cream" />
              <form action={signOut}>
                <button
                  type="submit"
                  className="cursor-pointer rounded-[3px] px-3 py-2 text-[13px] text-cream/70 transition-colors hover:bg-cream/10 hover:text-cream focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sunset"
                >
                  Sign out
                </button>
              </form>
            </div>
          </div>

          {/* Small screens: nav moves to its own scrollable row */}
          <NavLinks items={nav} className="flex overflow-x-auto border-t border-cream/10 px-4 md:hidden" />
        </header>
      </div>

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10 sm:py-12 print:max-w-none print:p-0">{children}</main>
    </div>
  );
}
