import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Placeholder until the buyer/seller dashboards exist — confirms sign-in works end to end.
export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .single();

  async function signOut() {
    "use server";
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect("/login?message=signed-out");
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-24">
      <p className="font-mono text-[11px] tracking-[0.2em] text-ink-soft uppercase">Signed in</p>
      <h1 className="mt-3 font-display text-5xl font-light tracking-tight">
        {profile?.full_name ?? user.email}
      </h1>
      <p className="mt-4 text-ink-soft">
        {user.email} &middot; role: <span className="font-mono text-ink">{profile?.role ?? "none"}</span>
      </p>
      <form action={signOut} className="mt-10">
        <button
          type="submit"
          className="cursor-pointer text-sm font-medium underline decoration-sunset decoration-2 underline-offset-4 hover:text-sunset"
        >
          Sign out
        </button>
      </form>
    </main>
  );
}
