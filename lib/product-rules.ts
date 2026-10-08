import { CATEGORIES, CONTAINER_TYPES, STRAIN_TYPES, SUB_CATEGORIES, UNITS, type Category } from "@/lib/catalog";

// One set of product rules for the product form and the spreadsheet import.

export type ProductFields = {
  name: string;
  category: string;
  sub_category: string | null;
  strain_type: string;
  thc_percentage: number | null;
  description: string | null;
  price_per_unit: number | null;
  unit: string;
  min_order_qty: number | null;
  stock_qty: number | null;
  sku: string | null;
  container_type: string;
  is_active: boolean;
};

export function validateProduct(product: ProductFields): Record<string, string> {
  const errors: Record<string, string> = {};
  const category = product.category as Category;

  if (!product.name) errors.name = "Give the product a name.";
  else if (product.name.length > 120) errors.name = "Keep it under 120 characters.";
  if (!CATEGORIES.some((c) => c.value === category)) errors.category = "Choose a category.";
  else if (product.sub_category && !SUB_CATEGORIES[category].some((s) => s.value === product.sub_category)) {
    errors.sub_category = "Choose a type from the list.";
  }
  if (!STRAIN_TYPES.some((s) => s.value === product.strain_type)) errors.strain_type = "Choose a strain type.";
  if (product.thc_percentage !== null && (!Number.isFinite(product.thc_percentage) || product.thc_percentage < 0 || product.thc_percentage > 100)) {
    errors.thc_percentage = "Enter a percentage from 0 to 100.";
  }
  if (product.price_per_unit === null || !Number.isFinite(product.price_per_unit) || product.price_per_unit <= 0) {
    errors.price_per_unit = "Enter a price above $0.";
  } else if (product.price_per_unit >= 1_000_000) {
    errors.price_per_unit = "That price looks too high.";
  }
  if (!UNITS.some((u) => u.value === product.unit)) errors.unit = "Choose a unit.";
  if (product.stock_qty === null || !Number.isInteger(product.stock_qty) || product.stock_qty < 0) {
    errors.stock_qty = "Enter a whole number, 0 or more.";
  }
  if (product.min_order_qty !== null && (!Number.isInteger(product.min_order_qty) || product.min_order_qty < 1)) {
    errors.min_order_qty = "Enter a whole number, 1 or more.";
  }
  if (!CONTAINER_TYPES.some((c) => c.value === product.container_type)) errors.container_type = "Choose a container.";
  if (product.sku && product.sku.length > 40) errors.sku = "Keep the SKU under 40 characters.";
  if (product.description && product.description.length > 2000) errors.description = "Keep it under 2,000 characters.";
  return errors;
}

export const roundPrice = (price: number) => Math.round(price * 100) / 100;
