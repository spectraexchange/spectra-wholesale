import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Signed-in users skip these; everyone else is sent to /login from PROTECTED.
const AUTH_PAGES = ["/login", "/forgot-password"];
const PROTECTED = ["/dashboard", "/reset-password"];

// Refreshes the Supabase auth session on every request, then applies coarse redirects.
// This is an optimistic check only — pages still verify the user themselves.
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const { pathname } = request.nextUrl;
  const matches = (paths: string[]) => paths.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  if (!user && matches(PROTECTED)) {
    return redirectWithCookies(request, response, "/login");
  }
  if (user && matches(AUTH_PAGES)) {
    return redirectWithCookies(request, response, "/dashboard");
  }

  return response;
}

// Carry refreshed session cookies onto the redirect so the session isn't dropped.
function redirectWithCookies(request: NextRequest, from: NextResponse, path: string) {
  const redirect = NextResponse.redirect(new URL(path, request.url));
  from.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  return redirect;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
