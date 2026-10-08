import { CATEGORIES, CONTAINER_TYPES, SUB_CATEGORIES, UNITS, type Category, type Product } from "@/lib/catalog";
import { roundPrice, validateProduct, type ProductFields } from "@/lib/product-rules";

// Spreadsheet import, shared by the browser preview and the server action so the
// preview shows exactly what will be saved. Column names cover Spectra's template
// plus common LeafLink / Apex Trading export headers; anything else is mapped by hand.

export type ImportField = keyof ProductFields | "image_url";

export const IMPORT_FIELDS: { key: ImportField; label: string; required?: boolean; aliases: string[]; example: string }[] = [
  { key: "name", label: "Name", required: true, example: "Blue Dream 3.5g", aliases: ["name", "product", "productname", "title", "itemname", "item", "listingname", "displayname"] },
  { key: "sku", label: "SKU", example: "BD-35", aliases: ["sku", "productsku", "itemsku", "skunumber", "productcode", "itemcode", "code", "partnumber"] },
  { key: "category", label: "Category", required: true, example: "Flower", aliases: ["category", "productcategory", "categoryname", "producttype", "type", "itemcategory", "class"] },
  { key: "sub_category", label: "Sub-category", example: "A Bud", aliases: ["subcategory", "subtype", "productsubcategory", "subcategoryname", "producttypedetail", "style"] },
  { key: "strain_type", label: "Strain type", example: "Hybrid", aliases: ["straintype", "strainclassification", "classification", "species", "lineage", "indicasativa", "genetics"] },
  { key: "thc_percentage", label: "THC %", example: "24.5", aliases: ["thc", "thcpercent", "thcpercentage", "totalthc", "thcpct", "thccontent", "potency", "thcmax"] },
  { key: "price_per_unit", label: "Price", required: true, example: "18.00", aliases: ["price", "wholesaleprice", "unitprice", "priceperunit", "saleprice", "wholesale", "listprice", "pricepercaseunit", "baseprice"] },
  { key: "unit", label: "Unit", required: true, example: "unit", aliases: ["unit", "unitofmeasure", "uom", "sellunit", "unittype", "saleunit", "unitofsale", "sellby"] },
  { key: "stock_qty", label: "Stock", required: true, example: "120", aliases: ["stock", "inventory", "quantity", "qty", "available", "availablequantity", "quantityavailable", "onhand", "inventoryquantity", "stockqty", "availableinventory", "quantityonhand"] },
  { key: "min_order_qty", label: "Min. order", example: "6", aliases: ["minorder", "minimumorder", "minorderqty", "moq", "minimumorderquantity", "minqty", "minimum", "orderminimum"] },
  { key: "container_type", label: "Container", example: "Glass", aliases: ["container", "containertype", "packaging", "packagingtype", "package"] },
  { key: "description", label: "Description", example: "Sweet berry nose, dense buds.", aliases: ["description", "productdescription", "details", "longdescription", "notes", "about"] },
  { key: "is_active", label: "Status", example: "Active", aliases: ["status", "active", "isactive", "visible", "listed", "visibility", "published", "listingstatus"] },
  { key: "image_url", label: "Image link", example: "https://…/blue-dream.jpg", aliases: ["image", "imageurl", "photo", "photourl", "picture", "images", "primaryimage", "imagelink", "mainimage", "featuredimage", "imageurls", "thumbnail"] },
];

export const MAX_IMPORT_ROWS = 2000;

const norm = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");

export type Mapping = Partial<Record<ImportField, number>>; // field → column index

export function guessMapping(headers: string[]): Mapping {
  const mapping: Mapping = {};
  const used = new Set<number>();
  const keys = headers.map(norm);
  // Exact alias first, then headers that start with a longer alias ("Wholesale Price (USD)")
  for (const pass of ["exact", "prefix"] as const) {
    for (const field of IMPORT_FIELDS) {
      if (mapping[field.key] !== undefined) continue;
      for (const alias of field.aliases) {
        const index = keys.findIndex((k, i) => !used.has(i) && k !== "" && (pass === "exact" ? k === alias : alias.length >= 5 && k.startsWith(alias)));
        if (index !== -1) {
          mapping[field.key] = index;
          used.add(index);
          break;
        }
      }
    }
  }
  return mapping;
}

// ── Value cleanup ────────────────────────────────────────────────────────────

const CATEGORY_WORDS: Record<string, Category> = {
  flower: "flower", flowers: "flower", bud: "flower", buds: "flower", smalls: "flower", shake: "flower",
  preroll: "preroll", prerolls: "preroll", joint: "preroll", joints: "preroll", blunt: "preroll", blunts: "preroll",
  concentrate: "concentrate", concentrates: "concentrate", extract: "concentrate", extracts: "concentrate", dab: "concentrate", dabs: "concentrate",
  cartridge: "cartridge", cartridges: "cartridge", cart: "cartridge", carts: "cartridge", vape: "cartridge", vapes: "cartridge",
  vapecartridge: "cartridge", vapecartridges: "cartridge", vaporizer: "cartridge", vaporizers: "cartridge", vapepen: "cartridge",
  disposable: "disposable", disposables: "disposable", disposablevape: "disposable", disposablevapes: "disposable",
  edible: "edible", edibles: "edible", beverage: "edible", beverages: "edible", drink: "edible", drinks: "edible",
  tincture: "tincture", tinctures: "tincture",
  topical: "topical", topicals: "topical",
  merchandise: "merchandise", merch: "merchandise", accessory: "merchandise", accessories: "merchandise", apparel: "merchandise", gear: "merchandise",
  other: "other", misc: "other", miscellaneous: "other",
};

// "Live Resin" → concentrate / live_resin, so a sub-category alone still places the product.
const SUB_LOOKUP = new Map<string, { category: Category; sub: string }>();
for (const [category, subs] of Object.entries(SUB_CATEGORIES) as [Category, { value: string; label: string }[]][]) {
  for (const sub of subs) {
    SUB_LOOKUP.set(norm(sub.label), { category, sub: sub.value });
    SUB_LOOKUP.set(norm(sub.value), { category, sub: sub.value });
  }
}
for (const [alias, sub] of Object.entries({ gummy: "gummies", chocolates: "chocolate", edibledrink: "beverage", capsules: "capsule", cookie: "baked_good", cookies: "baked_good", brownie: "baked_good", candy: "hard_candy", aio: "all_in_one", disposable: "disposable_vape", disposables: "disposable_vape", "510": "510_thread", "510cartridge": "510_thread", pods: "pod", lotions: "lotion", balms: "balm", salves: "salve", patches: "patch", infusedpreroll: "infused", infusedprerolls: "infused", minis: "mini", packs: "pack", prerollpack: "pack", abuds: "a_bud", bbuds: "b_bud", smalls: "b_bud" })) {
  const found = SUB_LOOKUP.get(norm(sub));
  if (found) SUB_LOOKUP.set(alias, found);
}

function readCategory(raw: string, subRaw: string): { category: string; sub: string | null; error?: string } {
  const key = norm(raw);
  const subKey = norm(subRaw);
  const byWord = CATEGORY_WORDS[key] ?? CATEGORIES.find((c) => norm(c.label) === key)?.value;
  const viaSub = SUB_LOOKUP.get(subKey);
  const viaCategoryText = SUB_LOOKUP.get(key); // e.g. Category column says "Live Resin"

  // "Vape" + "Disposable" or "Edible" + "Gummies": the type decides when it's more specific
  if (byWord) {
    if (!subKey) return { category: byWord, sub: null };
    if (viaSub && (viaSub.category === byWord || (byWord === "cartridge" && viaSub.category === "disposable"))) {
      return { category: viaSub.category, sub: viaSub.sub };
    }
    return { category: byWord, sub: null }; // unknown type just isn't set
  }
  if (viaCategoryText) return { category: viaCategoryText.category, sub: viaCategoryText.sub };
  if (!key && viaSub) return { category: viaSub.category, sub: viaSub.sub };
  return { category: "", sub: null, error: raw ? `Unknown category “${raw}”.` : "Missing category." };
}

function readStrain(raw: string): string {
  const key = norm(raw);
  if (!key) return "na";
  if (/^indica(dominant|dom|hybrid|leaning)/.test(key) || key === "indicadom") return "indica_dom";
  if (/^sativa(dominant|dom|hybrid|leaning)/.test(key) || key === "sativadom") return "sativa_dom";
  if (key.startsWith("indica")) return "indica";
  if (key.startsWith("sativa")) return "sativa";
  if (key.startsWith("hybrid") || key === "balanced") return "hybrid";
  return "na";
}

const UNIT_WORDS: Record<string, string> = {
  g: "g", gr: "g", gram: "g", grams: "g", gm: "g",
  oz: "oz", ounce: "oz", ounces: "oz",
  lb: "lb", lbs: "lb", pound: "lb", pounds: "lb",
  unit: "unit", units: "unit", each: "unit", ea: "unit", piece: "unit", pieces: "unit", item: "unit", items: "unit", pc: "unit", pcs: "unit", ct: "unit", count: "unit",
  pack: "pack", packs: "pack", pk: "pack",
  case: "case", cases: "case", cs: "case",
  ml: "ml", milliliter: "ml", milliliters: "ml",
};

function readUnit(raw: string): { unit: string; error?: string } {
  const key = norm(raw);
  if (!key) return { unit: "unit" };
  const unit = UNIT_WORDS[key] ?? UNITS.find((u) => norm(u.label) === key)?.value;
  return unit ? { unit } : { unit: "", error: `Unknown unit “${raw}”. Use gram, ounce, pound, unit, pack, case or mL.` };
}

function readContainer(raw: string): string {
  const key = norm(raw);
  if (!key) return "none";
  return CONTAINER_TYPES.find((c) => norm(c.label) === key || c.value === key)?.value ?? (key === "jar" || key === "jars" ? "glass" : key === "bag" ? "bagged" : key === "box" ? "boxed" : key === "tube" ? "tubed" : key === "bottle" ? "bottled" : "none");
}

function readNumber(raw: string): number | null | "bad" {
  const cleaned = raw.replace(/[$,%\s]/g, "");
  if (!cleaned) return null;
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : "bad";
}

function readActive(raw: string): boolean {
  const key = norm(raw);
  return !["no", "n", "false", "0", "hidden", "inactive", "archived", "unavailable", "draft", "unlisted", "off", "disabled"].includes(key);
}

function readImage(raw: string): string | null {
  const first = raw.split(/[\s,;|]+/).find((part) => /^https?:\/\//i.test(part));
  return first ?? null;
}

// ── Rows ─────────────────────────────────────────────────────────────────────

export type ImportValues = Partial<Record<ImportField, string>>;

/** Picks the mapped cells out of a spreadsheet row. */
export function pickValues(row: string[], mapping: Mapping): ImportValues {
  const values: ImportValues = {};
  for (const [field, index] of Object.entries(mapping) as [ImportField, number][]) values[field] = (row[index] ?? "").trim();
  return values;
}

export type ExistingProduct = Pick<Product, "id" | "name" | "sku" | "image_url" | "is_archived"> & ProductFields;

export type PlannedRow =
  | { action: "create" | "update"; product: ProductFields; existingId?: string; imageUrl: string | null; matchedBy?: "sku" | "name" }
  | { action: "skip"; error: string; name: string };

export function productIndex(existing: ExistingProduct[]) {
  const bySku = new Map<string, ExistingProduct>();
  const byName = new Map<string, ExistingProduct>();
  for (const p of existing) {
    if (p.sku) bySku.set(p.sku.trim().toLowerCase(), p);
    byName.set(p.name.trim().toLowerCase(), p);
  }
  return { bySku, byName };
}

/**
 * Turns one row into a create or update. Existing products are matched by SKU,
 * then by exact name; only the columns in the file overwrite what's there.
 * `seen` catches the same product twice in one file.
 */
export function planRow(values: ImportValues, index: ReturnType<typeof productIndex>, seen: Set<string>): PlannedRow {
  const has = (field: ImportField) => field in values;
  const name = values.name ?? "";
  const sku = values.sku || null;

  // A name only identifies a product when one side has no SKU; otherwise two sizes
  // sharing a name ("Kush Cart") with different SKUs are different products.
  const bySku = sku ? index.bySku.get(sku.toLowerCase()) : undefined;
  const byName = name ? index.byName.get(name.toLowerCase()) : undefined;
  const existing = bySku ?? (byName && (!sku || !byName.sku) ? byName : undefined);
  const matchedBy = existing ? (bySku ? "sku" : "name") : undefined;
  const skip = (error: string): PlannedRow => ({ action: "skip", error, name: name || existing?.name || "" });

  if (!name && !existing) return skip(sku ? `No product with SKU ${sku}, and no name to create one.` : "Missing name.");
  // Keyed every way a later row could refer to the same product, including
  // products created by an earlier chunk of this same import.
  const keys = [
    sku ? `sku:${sku.toLowerCase()}` : name && `name:${name.toLowerCase()}`,
    existing && `id:${existing.id}`,
    existing?.sku && `sku:${existing.sku.toLowerCase()}`,
  ].filter(Boolean) as string[];
  if (keys.some((k) => seen.has(k))) return skip("This product appears earlier in the file.");
  keys.forEach((k) => seen.add(k));

  const base: ProductFields = existing
    ? { ...pickFields(existing) }
    : { name: "", category: "", sub_category: null, strain_type: "na", thc_percentage: null, description: null, price_per_unit: null, unit: "unit", min_order_qty: null, stock_qty: null, sku: null, container_type: "none", is_active: true };
  const product: ProductFields = { ...base };

  if (name) product.name = name;
  if (has("sku") && sku) product.sku = sku;
  if (has("category") || has("sub_category")) {
    if (values.category || values.sub_category || !existing) {
      const read = readCategory(values.category ?? "", values.sub_category ?? "");
      if (read.error) {
        if (!existing || values.category) return skip(read.error);
      } else {
        product.category = read.category;
        product.sub_category = read.sub;
      }
    }
  } else if (!existing) return skip("Missing category.");
  if (has("strain_type") && (values.strain_type || !existing)) product.strain_type = readStrain(values.strain_type ?? "");
  if (has("thc_percentage") && values.thc_percentage) {
    // Edible potency is usually in mg, which isn't a percentage; leave it blank.
    const thc = /mg/i.test(values.thc_percentage) ? null : readNumber(values.thc_percentage);
    if (thc === "bad") return skip(`THC “${values.thc_percentage}” isn’t a number.`);
    product.thc_percentage = thc;
  }
  if (has("price_per_unit") && values.price_per_unit) {
    const price = readNumber(values.price_per_unit);
    if (price === "bad") return skip(`Price “${values.price_per_unit}” isn’t a number.`);
    product.price_per_unit = price === null ? null : roundPrice(price);
  }
  if (has("unit") && (values.unit || !existing)) {
    const read = readUnit(values.unit ?? "");
    if (read.error) return skip(read.error);
    product.unit = read.unit;
  }
  if (has("stock_qty") && values.stock_qty) {
    const stock = readNumber(values.stock_qty);
    if (stock === "bad") return skip(`Stock “${values.stock_qty}” isn’t a number.`);
    product.stock_qty = stock === null ? null : Math.max(0, Math.floor(stock));
  }
  if (has("min_order_qty") && values.min_order_qty) {
    const min = readNumber(values.min_order_qty);
    if (min === "bad") return skip(`Min. order “${values.min_order_qty}” isn’t a number.`);
    product.min_order_qty = min === null || min < 1 ? null : Math.floor(min);
  }
  if (has("container_type") && (values.container_type || !existing)) product.container_type = readContainer(values.container_type ?? "");
  if (has("description") && values.description) product.description = values.description;
  if (has("is_active") && (values.is_active || !existing)) product.is_active = readActive(values.is_active ?? "");

  const errors = validateProduct(product);
  const first = Object.entries(errors)[0];
  if (first) {
    const [field, message] = first;
    const label = IMPORT_FIELDS.find((f) => f.key === field)?.label ?? field;
    if (field === "stock_qty" && product.stock_qty === null) return skip("Missing stock.");
    if (field === "price_per_unit" && product.price_per_unit === null) return skip("Missing price.");
    return skip(`${label}: ${message}`);
  }

  // Photos only fill gaps, so re-running an import doesn't re-download every image.
  const imageUrl = has("image_url") && values.image_url && !existing?.image_url ? readImage(values.image_url) : null;
  return { action: existing ? "update" : "create", product, existingId: existing?.id, imageUrl, matchedBy };
}

function pickFields(p: ExistingProduct): ProductFields {
  return {
    name: p.name, category: p.category, sub_category: p.sub_category, strain_type: p.strain_type, thc_percentage: p.thc_percentage,
    description: p.description, price_per_unit: p.price_per_unit, unit: p.unit, min_order_qty: p.min_order_qty, stock_qty: p.stock_qty,
    sku: p.sku, container_type: p.container_type, is_active: p.is_active,
  };
}

export const EXISTING_PRODUCT_COLUMNS =
  "id, name, sku, image_url, is_archived, category, sub_category, strain_type, thc_percentage, description, price_per_unit, unit, min_order_qty, stock_qty, container_type, is_active";

// ── Files ────────────────────────────────────────────────────────────────────

/** RFC 4180 CSV: quoted fields, doubled quotes, newlines inside quotes. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  const input = text.replace(/^﻿/, "");
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (quoted) {
      if (ch === '"' && input[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && input[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += ch;
  }
  if (cell !== "" || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

/** Header row = the first row with at least two filled cells (exports often start with a title line). */
export function splitHeader(rows: string[][]): { headers: string[]; body: string[][] } {
  const at = rows.findIndex((r) => r.filter((c) => c.trim()).length >= 2);
  if (at === -1) return { headers: [], body: [] };
  return { headers: rows[at].map((h) => h.trim()), body: rows.slice(at + 1) };
}

export function templateCsv() {
  const quote = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  return [IMPORT_FIELDS.map((f) => f.label), IMPORT_FIELDS.map((f) => f.example)].map((r) => r.map(quote).join(",")).join("\n") + "\n";
}
