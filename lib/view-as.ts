import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

// While a super admin is "viewing as" a user, the browser holds that user's
// session plus this signed cookie naming the admin, so Exit can switch back.
export const VIEW_AS_COOKIE = "spectra_view_as";
const MAX_AGE = 60 * 60 * 2; // two hours

export type ViewAs = { adminId: string; targetId: string; targetName: string; companyName: string; companyId: string; startedAt: number };

const secret = () => process.env.VIEW_AS_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY!;
const sign = (payload: string) => createHmac("sha256", secret()).update(payload).digest("base64url");

export async function setViewAsCookie(value: ViewAs) {
  const payload = Buffer.from(JSON.stringify(value)).toString("base64url");
  (await cookies()).set(VIEW_AS_COOKIE, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function readViewAs(): Promise<ViewAs | null> {
  const raw = (await cookies()).get(VIEW_AS_COOKIE)?.value;
  if (!raw) return null;
  const [payload, signature] = raw.split(".");
  if (!payload || !signature) return null;

  const expected = Buffer.from(sign(payload));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;

  try {
    const value = JSON.parse(Buffer.from(payload, "base64url").toString()) as ViewAs;
    return Date.now() - value.startedAt < MAX_AGE * 1000 ? value : null;
  } catch {
    return null;
  }
}

export async function clearViewAsCookie() {
  (await cookies()).delete(VIEW_AS_COOKIE);
}
