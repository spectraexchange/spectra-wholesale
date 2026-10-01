import type { Metadata } from "next";
import Link from "next/link";
import { ProductForm } from "../product-form";

export const metadata: Metadata = { title: "Add product · Spectra Wholesale" };

export default function NewProductPage() {
  return (
    <>
      <Link href="/seller/products" className="text-sm text-ink-soft hover:text-sunset">
        &larr; Products
      </Link>
      <h1 className="mt-3 mb-10 font-display text-5xl font-light tracking-tight">Add a product</h1>
      <ProductForm />
    </>
  );
}
