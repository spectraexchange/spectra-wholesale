import type { Metadata } from "next";
import Link from "next/link";
import { ProductImport } from "@/components/product-import";
import { requireSeller } from "@/lib/auth";
import { EXISTING_PRODUCT_COLUMNS, type ExistingProduct } from "@/lib/product-import";
import { createServiceClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Import products · Spectra Wholesale" };
// Each import chunk may copy a few dozen photos.
export const maxDuration = 60;

export default async function ImportProductsPage() {
  const { company } = await requireSeller();
  const { data } = await createServiceClient().from("products").select(EXISTING_PRODUCT_COLUMNS).eq("seller_company_id", company.id);

  return (
    <>
      <Link href="/seller/products" className="text-sm text-ink-soft hover:text-sunset">
        &larr; Products
      </Link>
      <h1 className="mt-3 font-display text-5xl font-light tracking-tight">Import products</h1>
      <p className="mt-3 mb-12 max-w-2xl text-[15px] text-ink-soft">
        Bring your whole catalog over from a spreadsheet. Nothing is saved until you review the preview and choose Import.
      </p>
      <ProductImport existing={(data ?? []) as unknown as ExistingProduct[]} companyId={null} doneHref="/seller/products" />
    </>
  );
}
