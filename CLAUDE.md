@AGENTS.md

# Spectra Wholesale

Alaska-only B2B cannabis wholesale marketplace. Buyers (retailers) order from vendors (cultivators/processors).
Roles: `buyer`, `buyer_admin`, `seller`, `seller_admin`, `super_admin`.

## Design system — the login page is the reference

The owner approved the auth pages (`app/(auth)/`) as the look for the whole app, including the
internal dashboards. New UI should feel like it belongs next to that sign-in panel.

- **Palette** (tokens in `app/globals.css`, use the Tailwind names, not hex):
  `paper` cream surfaces · `ink` / `ink-soft` text · `line` hairlines · `field` / `field-focus` input
  backgrounds · `sunset` primary action (`sunset-hover`, text on it is `on-sunset`) · `press` hard
  shadow under buttons · `danger`/`success` (+ `-tint`) for states. Fixed in both themes: `night`
  (nav + aurora background), `cream` (text on night), `teal`, `amber`.
  Colors come from the script logo (`public/spectra-logo.png`).
- **Night mode:** every themed token has a light and a dark value; `data-theme` on `<html>` is set
  before paint by `lib/theme.ts` and switched by `components/theme-toggle.tsx`. Never hardcode
  `bg-white`, `text-paper`-on-orange, or `var(--ink)` shadows — use the tokens above so both modes
  work without `dark:` variants. Auth pages pin `data-theme="light"` and always stay cream.
- **App shell:** cream (or night-mode) content area under a dark `night` navigation bar with
  `text-cream` links and the theme toggle.
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
- Vendor pages/actions call `requireSeller()` and filter every query by `company.id`
  (`.eq("seller_company_id", company.id)`), since the service client bypasses RLS.
- Product vocabulary (categories, types, units, containers) lives in `lib/catalog.ts` and must
  match the DB check constraints.
- Uploads go browser → storage via signed upload URLs created in a server action (keeps files out
  of the 4.5 MB server-action body limit and inside the right folder).
- Reuse `useLiveErrors` from `components/form.tsx` so field errors clear as soon as they're edited.
- Never add companies↔profiles joins to RLS policies (caused infinite recursion before).
- Access-request approval must copy every submitted field onto `companies`/`profiles`
  (`app/admin/access-requests/actions.ts`) so users never re-enter data.
- Schema changes go in `supabase/migrations/` and are run by hand in the Supabase SQL editor.
