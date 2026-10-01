@AGENTS.md

# Spectra Wholesale

Alaska-only B2B cannabis wholesale marketplace. Buyers (retailers) order from vendors (cultivators/processors).
Roles: `buyer`, `buyer_admin`, `seller`, `seller_admin`, `super_admin`.

## Design system — the login page is the reference

The owner approved the auth pages (`app/(auth)/`) as the look for the whole app, including the
internal dashboards. New UI should feel like it belongs next to that sign-in panel.

- **Palette** (tokens in `app/globals.css`, use the Tailwind names, not hex):
  `paper` cream surfaces · `ink` / `ink-soft` text · `line` hairlines · `sunset` primary action
  (`sunset-hover` on hover) · `teal` accent + offset shadows · `amber` highlights ·
  `night` deep background · `danger`/`success` (+ `-tint`) for states.
  Colors come from the script logo (`public/spectra-logo.png`).
- **Type:** `font-display` (Fraunces) for headings, light/normal weight · body is Plus Jakarta Sans ·
  `font-mono` (JetBrains Mono) for small uppercase tracked labels (`text-[11px] tracking-[0.16em] uppercase`).
- **Signature details:** hard offset shadows instead of soft blur (panel: `shadow-[8px_8px_0_0_var(--teal)]`,
  buttons: `shadow-[3px_3px_0_0_var(--ink)]` that press flat on `active:`), small radii (`rounded-[3px]` controls,
  `rounded-md` panels), left-border notices, underline links with a `sunset` decoration.
- **Reuse** `components/form.tsx` (Field, TextArea, SubmitButton, Notice) rather than restyling inputs.
- **Avoid:** pill badges, rounded-xl card grids, soft drop shadows, centered marketing heroes,
  competing CTAs. Prefer line/divider structure for lists and data.
- `components/aurora-sky.tsx` is the auth-page background; keep it there, not behind data-heavy screens.

## Data rules

- Admin/server data that crosses companies uses `createServiceClient()`; role checks via `lib/auth.ts`.
- Never add companies↔profiles joins to RLS policies (caused infinite recursion before).
- Access-request approval must copy every submitted field onto `companies`/`profiles`
  (`app/admin/access-requests/actions.ts`) so users never re-enter data.
- Schema changes go in `supabase/migrations/` and are run by hand in the Supabase SQL editor.
