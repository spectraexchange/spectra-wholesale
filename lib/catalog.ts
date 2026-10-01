// Product vocabulary. Values must match the check constraints on `products`
// (see supabase/migrations/20261002_product_categories.sql).

export const CATEGORIES = [
  { value: "flower", label: "Flower" },
  { value: "preroll", label: "Pre-rolls" },
  { value: "concentrate", label: "Extracts" },
  { value: "cartridge", label: "Cartridges" },
  { value: "disposable", label: "Disposables" },
  { value: "edible", label: "Edibles" },
  { value: "tincture", label: "Tinctures" },
  { value: "topical", label: "Topicals" },
  { value: "merchandise", label: "Merchandise" },
  { value: "other", label: "Other" },
] as const;
export type Category = (typeof CATEGORIES)[number]["value"];

export const SUB_CATEGORIES: Record<Category, { value: string; label: string }[]> = {
  flower: [
    { value: "a_bud", label: "A Bud" },
    { value: "b_bud", label: "B Bud" },
    { value: "popcorn", label: "Popcorn" },
    { value: "trim", label: "Trim" },
    { value: "kief", label: "Kief" },
  ],
  preroll: [
    { value: "single", label: "Single" },
    { value: "pack", label: "Pack" },
    { value: "infused", label: "Infused" },
    { value: "mini", label: "Mini" },
  ],
  concentrate: [
    { value: "wax", label: "Wax" },
    { value: "shatter", label: "Shatter" },
    { value: "budder", label: "Budder" },
    { value: "sugar_wax", label: "Sugar Wax" },
    { value: "live_resin", label: "Live Resin" },
    { value: "live_rosin", label: "Live Rosin" },
    { value: "rosin", label: "Rosin" },
    { value: "distillate", label: "Distillate" },
    { value: "diamonds", label: "Diamonds" },
    { value: "sauce", label: "Sauce" },
    { value: "hash", label: "Hash" },
  ],
  cartridge: [
    { value: "510_thread", label: "510 Thread" },
    { value: "pod", label: "Pod" },
    { value: "all_in_one", label: "All-in-One" },
  ],
  disposable: [{ value: "disposable_vape", label: "Disposable Vape" }],
  edible: [
    { value: "gummies", label: "Gummies" },
    { value: "chocolate", label: "Chocolate" },
    { value: "beverage", label: "Beverage" },
    { value: "capsule", label: "Capsule" },
    { value: "baked_good", label: "Baked Good" },
    { value: "hard_candy", label: "Hard Candy" },
  ],
  tincture: [
    { value: "oil_tincture", label: "Oil Tincture" },
    { value: "sublingual", label: "Sublingual" },
  ],
  topical: [
    { value: "lotion", label: "Lotion" },
    { value: "balm", label: "Balm" },
    { value: "salve", label: "Salve" },
    { value: "patch", label: "Patch" },
  ],
  merchandise: [
    { value: "apparel", label: "Apparel" },
    { value: "accessories", label: "Accessories" },
  ],
  other: [],
};

export const STRAIN_TYPES = [
  { value: "na", label: "N/A" },
  { value: "indica", label: "Indica" },
  { value: "indica_dom", label: "Indica dominant" },
  { value: "hybrid", label: "Hybrid" },
  { value: "sativa_dom", label: "Sativa dominant" },
  { value: "sativa", label: "Sativa" },
] as const;
export type StrainType = (typeof STRAIN_TYPES)[number]["value"];

export const UNITS = [
  { value: "g", label: "gram" },
  { value: "oz", label: "ounce" },
  { value: "lb", label: "pound" },
  { value: "unit", label: "unit" },
  { value: "pack", label: "pack" },
  { value: "case", label: "case" },
  { value: "ml", label: "mL" },
] as const;

export const CONTAINER_TYPES = [
  { value: "none", label: "None" },
  { value: "bagged", label: "Bagged" },
  { value: "boxed", label: "Boxed" },
  { value: "tubed", label: "Tubed" },
  { value: "glass", label: "Glass" },
  { value: "bottled", label: "Bottled" },
] as const;

export type Product = {
  id: string;
  seller_company_id: string;
  name: string;
  category: Category;
  sub_category: string | null;
  strain_type: StrainType;
  thc_percentage: number | null;
  description: string | null;
  price_per_unit: number;
  unit: string;
  min_order_qty: number | null;
  stock_qty: number;
  sku: string | null;
  container_type: string;
  is_active: boolean;
  is_archived: boolean;
  image_url: string | null;
  test_results_url: string | null;
  created_at: string;
  updated_at: string;
};

const labelFor = (list: readonly { value: string; label: string }[], value: string | null) =>
  list.find((item) => item.value === value)?.label ?? value ?? "";

export const categoryLabel = (value: string) => labelFor(CATEGORIES, value);
export const strainLabel = (value: string) => labelFor(STRAIN_TYPES, value);
export const subCategoryLabel = (category: string, value: string | null) =>
  labelFor(SUB_CATEGORIES[category as Category] ?? [], value);
export const unitLabel = (value: string) => labelFor(UNITS, value);

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
export const formatMoney = (value: number) => money.format(value);

// "6 units", "1 pack", "250 mL"
export function formatQty(quantity: number, unit: string) {
  const label = unitLabel(unit);
  return `${quantity} ${label}${quantity === 1 || unit === "ml" ? "" : "s"}`;
}
