import { createServiceClient } from "@/lib/supabase/server";

// Invoice designs an admin can switch between in /admin/tools. Every invoice on
// the platform renders with the active one. All designs share one layout
// (components/invoice.tsx); a design sets the accent colors and header style.
// The sheet is always light (it's a printed document), so these are fixed colors.
// To add a design, add an entry here — no migration needed.

export type InvoiceTemplate = {
  key: string;
  name: string;
  occasion: string; // when to use it, shown in Tools
  header: "rule" | "band"; // thick accent rule under the header, or a full colored band
  accent: string; // headings, rules, labels
  band: string; // header band background (band header only)
  bandInk: string; // text on the band
  tint: string; // soft fill behind totals and the payment note
  edge: string; // hard offset shadow around the sheet on screen
};

export const INVOICE_TEMPLATES: InvoiceTemplate[] = [
  {
    key: "ledger",
    name: "Spectra Ledger",
    occasion: "Year-round default",
    header: "rule",
    accent: "#c4461a",
    band: "#1b1813",
    bandInk: "#f7efdc",
    tint: "#f3e7cb",
    edge: "#1f5c66",
  },
  {
    key: "aurora",
    name: "Aurora",
    occasion: "Winter · Nov–Feb",
    header: "band",
    accent: "#1f5c66",
    band: "#030a14",
    bandInk: "#f7efdc",
    tint: "#e2ece9",
    edge: "#2f8f7f",
  },
  {
    key: "breakup",
    name: "Breakup",
    occasion: "Spring thaw · Mar–May",
    header: "rule",
    accent: "#3f6b3a",
    band: "#3f6b3a",
    bandInk: "#f7efdc",
    tint: "#e4ead6",
    edge: "#8a9a5b",
  },
  {
    key: "midnight-sun",
    name: "Midnight Sun",
    occasion: "Summer · Jun–Aug",
    header: "band",
    accent: "#b4600a",
    band: "#f2a531",
    bandInk: "#1b1813",
    tint: "#fbecd0",
    edge: "#c4461a",
  },
  {
    key: "fireweed",
    name: "Fireweed",
    occasion: "Late summer & fall · Aug–Oct",
    header: "rule",
    accent: "#a12d62",
    band: "#a12d62",
    bandInk: "#fbeff4",
    tint: "#f6e1e8",
    edge: "#5b2a86",
  },
  {
    key: "four-twenty",
    name: "4/20",
    occasion: "Special event · April",
    header: "band",
    accent: "#2f6d3a",
    band: "#173d22",
    bandInk: "#e9f2c9",
    tint: "#e5efd6",
    edge: "#f2a531",
  },
];

export const DEFAULT_TEMPLATE = INVOICE_TEMPLATES[0];
export const templateFor = (key: string | null | undefined) =>
  INVOICE_TEMPLATES.find((t) => t.key === key) ?? DEFAULT_TEMPLATE;

// The design every invoice uses right now. Falls back to the default if the
// setting (or the platform_settings table) is missing.
export async function getActiveTemplate() {
  const { data } = await createServiceClient().from("platform_settings").select("value").eq("key", "invoice_template").maybeSingle();
  return templateFor(data?.value);
}
