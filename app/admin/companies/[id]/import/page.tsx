import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductImport } from "@/components/product-import";
import { requireSuperAdmin } from "@/lib/auth";
import { EXISTING_PRODUCT_COLUMNS, type ExistingProduct } from "@/lib/product-import";
import { createServiceClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Import products · Spectra Admin" };
// Each import chunk may copy a few dozen photos.
export const maxDuration = 60;

export default async function AdminImportProductsPage({ params }: PageProps<"/admin/companies/[id]/import">) {
  // Checked here, not just in the layout: layouts don't stop a page from rendering.
  await requireSuperAdmin();
  const { id } = await params;
  const service = createServiceClient();

  const { data: company } = await service.from("companies").select("id, name, type").eq("id", id).maybeSingle();
  if (!company || company.type !== "seller") notFound();
  const { data } = await service.from("products").select(EXISTING_PRODUCT_COLUMNS).eq("seller_company_id", id);

  return (
    <>
      <Link href={`/admin/companies/${id}`} className="text-sm text-ink-soft hover:text-sunset">
        &larr; {company.name}
      </Link>
      <h1 className="mt-3 font-display text-5xl font-light tracking-tight">Import products</h1>
      <p className="mt-3 mb-12 max-w-2xl text-[15px] text-ink-soft">
        Importing into <strong className="font-semibold text-ink">{company.name}</strong>&rsquo;s catalog. Nothing is saved until you review the
        preview and choose Import. The import is logged in their admin activity.
      </p>
      <ProductImport existing={(data ?? []) as unknown as ExistingProduct[]} companyId={id} doneHref={`/admin/companies/${id}`} />
    </>
  );
}
