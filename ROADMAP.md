# Spectra Wholesale — roadmap and working notes

Where the project stands, what's queued, and decisions already made. Kept in the
repo so it's the same on every computer. Update it when something ships or a
plan changes. Last updated 2026-10-26.

## Status

Live at www.spectrawholesale.com (Vercel, deploys on every push to `main`).
Supabase Pro (Postgres, Auth, Storage). Email through Resend.

Built so far: request access → admin approval → invite; vendor products
(single + spreadsheet import), buyer catalog / cart / checkout, orders with
stock that can't oversell (`place_order` locks rows), invoices, account
settings + license renewals, vendor logos and storefronts, admin (companies,
billing, View as, audit log), error log, support tickets.

First real order (ORD-1017, Outlook Dispensary → Denali fire) worked end to end
on 2026-10-08, emails included.

All migrations in `supabase/migrations/` through `20261009_vendor_menus.sql`
have been run on the live database.

`/api/health` runs a tiny database query and reports up/down. Vercel Cron calls
it daily at 18:00 UTC (`vercel.json`), which also keeps Supabase from seeing the
project as idle. Check the plan in Supabase → Billing if a pause warning ever
arrives: Pro projects don't pause.

## Queue (in order)

1. **Scale hardening.** Supabase returns at most 1,000 rows per query, and
   these load everything: buyer catalog (`app/buyer/browse/page.tsx`), vendor
   and admin order lists, admin companies stats. Past 1,000 products buyers
   silently stop seeing items. Fix: filter and paginate in the database. Also:
   - index migration for old-build tables: `products(seller_company_id)`,
     `orders(buyer_company_id, created_at)`, `orders(seller_company_id, created_at)`,
     `order_items(order_id)`, `order_items(product_id)`,
     `cart_items(buyer_profile_id)`, `profiles(company_id)`
   - shrink product photos to ~1600px on upload (cuts storage and backups by half+)
   - later: admin company page `listUsers` caps at 1,000; `site_errors` 90-day cleanup

2. **Team invites.** Nobody can add a second user to a company today, not even
   super admin. Company admins invite by name + email as Admin or Member
   (roles already exist: `*_admin` vs plain), reusing the approval invite
   email; change role; remove user (cuts access immediately, can't remove the
   last admin). Super admin can do the same from admin → Company → Users. Show
   "placed by" on orders. Stay with two roles until customers ask for more.

3. **Nightly off-site backups: built 2026-10-26, waiting on setup.** The job is
   `.github/workflows/nightly-backup.yml` (database dump + every Storage bucket →
   encrypted "Spectra Backups" folder in Google Drive via rclone; 30 daily + 12
   monthly database copies; failures email via GitHub and log to admin →
   Errors). Setup and restore steps: `docs/BACKUPS.md`. Remaining: owner adds
   the GitHub Secrets, runs it once by hand, then one test restore into a
   scratch Supabase project.

4. **Metrc integration, Phase 1.** See "Metrc" below.

5. **Real vendor import test.** Run an actual LeafLink or Apex export through
   the spreadsheet importer; add any unmatched column names to the aliases in
   `lib/product-import.ts`.

## Ideas offered, not requested yet

- "THC per package (mg)" field for edibles (THC % doesn't fit them).
- Screenshot attachments on support tickets.
- Vercel Skew Protection (paid setting) so open pages survive deploys; the app
  already reloads once on those errors as a fallback.

## Metrc

Spectra has a signed **Metrc Connect** API contract (Mar 2026): free tier,
unlimited facilities, **50,000 calls/month**, 5 calls/sec, 30-day data
lookback, **no webhooks**, sandbox access. Renews **2027-03-25** (Metrc may
renegotiate in the 30 days before). On the free tier, hitting the call cap means
upgrading, not overage fees.

Plan: optional per vendor (fewer than half of Alaska vendors connect Metrc).
Spectra's integrator key lives in Vercel env only. Each vendor pastes their own
Metrc user key, stored encrypted, used server-side only, never shown back.

- Phase 1: connect + confirm facilities; import active packages as products
  (stock from package quantity, THC and test results from lab results); sync
  only changed packages a few times a day, plus "Sync now" and a re-check before
  an order is confirmed; admin meter for API usage (budget ~1,600 calls/day).
- Phase 2: a confirmed order creates the outgoing transfer in Metrc; the vendor
  finalizes it in Metrc.
- Phase 3: show manifest status on the buyer's order.

Blocked on: Alaska Metrc API docs, sandbox details, integrator key added to
Vercel. Check auth and endpoints against the docs (don't rely on memory) and
review Metrc's API Terms for data-use rules before building.

## Housekeeping

- Old build left two unused, empty tables: `error_logs`, `support_tickets`.
  Safe to drop by hand in the SQL editor.
- Earlier attempts in `~/spectra-wholesale`, `~/Documents/spectra-exchange` and
  `~/highmarket-demo` are stale; this repo is the only live codebase.
- `.env.local` is not in git. Keep a copy in a password manager.
- Two computers: `.claude/settings.json` runs `git pull --ff-only` at the start
  of every Claude Code session (warns instead of merging if both machines have
  unpushed work), and `.vscode/settings.json` turns on background fetch so
  VS Code shows incoming commits. Push before switching computers.
