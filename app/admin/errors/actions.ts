"use server";

import { revalidatePath } from "next/cache";
import { requireSuperAdmin } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";

// Resolving marks every occurrence so far; if it happens again it reopens on its own.
export async function resolveError(fingerprint: string) {
  await requireSuperAdmin();
  await createServiceClient().from("site_errors").update({ resolved_at: new Date().toISOString() }).eq("fingerprint", fingerprint).is("resolved_at", null);
  revalidatePath("/admin", "layout");
}
