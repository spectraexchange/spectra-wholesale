import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSeller } from "@/lib/auth";
import type { Product } from "@/lib/catalog";
import { createServiceClient } from "@/lib/supabase/server";
import { ProductForm } from "../product-form";

export const metadata: Metadata = { title: "Edit product · Spectra Wholesale" };

export default async function EditProductPage({ params }: PageProps<"/seller/products/[id]">) {
  const { company } = await requireSeller();
  const { id } = await params;

  const { data } = await createServiceClient()
    .from("products")
    .select("*")
    .eq("id", id)
    .eq("seller_company_id", company.id)
    .maybeSingle();
  if (!data) notFound();
  const product = data as Product;

  return (
    <>
      <Link href="/seller/products" className="text-sm text-ink-soft hover:text-sunset">
        &larr; Products
      </Link>
      <h1 className="mt-3 mb-10 font-display text-5xl font-light tracking-tight">{product.name}</h1>
      <ProductForm product={product} />
    </>
  );
}
