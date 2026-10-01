"use client";

import Link from "next/link";
import { startTransition, useActionState, useState } from "react";
import { Field, FieldError, Label, Notice, Select, SubmitButton, TextArea, useLiveErrors } from "@/components/form";
import {
  CATEGORIES,
  CONTAINER_TYPES,
  STRAIN_TYPES,
  SUB_CATEGORIES,
  UNITS,
  type Category,
  type Product,
} from "@/lib/catalog";
import { createClient } from "@/lib/supabase/client";
import { createMediaUpload, saveProduct, type MediaKind, type ProductFormState } from "./actions";

const MAX_BYTES = { image: 8 * 1024 * 1024, coa: 15 * 1024 * 1024 };

export function ProductForm({ product }: { product?: Product }) {
  const [state, formAction, pending] = useActionState<ProductFormState, FormData>(saveProduct, {});
  const [category, setCategory] = useState<Category | "">(product?.category ?? "");
  const [imageUrl, setImageUrl] = useState(product?.image_url ?? "");
  const [coaUrl, setCoaUrl] = useState(product?.test_results_url ?? "");
  const [uploading, setUploading] = useState<MediaKind | null>(null);
  const [uploadError, setUploadError] = useState<Partial<Record<MediaKind, string>>>({});

  const { errors, markEdited } = useLiveErrors(state.fieldErrors);
  const subCategories = category ? SUB_CATEGORIES[category] : [];

  async function upload(kind: MediaKind, file: File | undefined) {
    if (!file) return;
    if (file.size > MAX_BYTES[kind]) {
      setUploadError((e) => ({ ...e, [kind]: `That file is over ${MAX_BYTES[kind] / 1024 / 1024} MB.` }));
      return;
    }
    setUploadError((e) => ({ ...e, [kind]: undefined }));
    setUploading(kind);
    try {
      const slot = await createMediaUpload(kind, file.name.split(".").pop() ?? "");
      if ("error" in slot) {
        setUploadError((e) => ({ ...e, [kind]: slot.error }));
        return;
      }
      const { error } = await createClient()
        .storage.from(slot.bucket)
        .uploadToSignedUrl(slot.path, slot.token, file, { contentType: file.type || undefined });
      if (error) {
        setUploadError((e) => ({ ...e, [kind]: "Upload failed. Try again." }));
        return;
      }
      (kind === "image" ? setImageUrl : setCoaUrl)(slot.publicUrl);
      markEdited(kind === "image" ? "image_url" : "test_results_url");
    } finally {
      setUploading(null);
    }
  }

  return (
    <form
      noValidate
      onChange={markEdited}
      onSubmit={(e) => {
        // Submit manually so a failed save doesn't reset the form.
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        startTransition(() => formAction(formData));
      }}
      className="grid gap-x-12 gap-y-10 lg:grid-cols-[minmax(0,1fr)_20rem]"
    >
      {product && <input type="hidden" name="id" value={product.id} />}
      <input type="hidden" name="image_url" value={imageUrl} />
      <input type="hidden" name="test_results_url" value={coaUrl} />

      <div className="space-y-10">
        {state.error && <Notice tone="error">{state.error}</Notice>}

        <Section title="Product">
          <Field label="Name" name="name" required defaultValue={product?.name} placeholder="Blue Dream" error={errors.name} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Category"
              name="category"
              options={CATEGORIES}
              placeholder="Choose…"
              value={category}
              onChange={(e) => setCategory(e.target.value as Category)}
              error={errors.category}
            />
            <Select
              // Remount when the category changes so the old type can't stick around
              key={category}
              label="Type"
              name="sub_category"
              options={subCategories}
              placeholder={subCategories.length ? "Choose…" : "None"}
              defaultValue={category === product?.category ? (product?.sub_category ?? "") : ""}
              disabled={!subCategories.length}
              error={errors.sub_category}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Strain"
              name="strain_type"
              options={STRAIN_TYPES}
              defaultValue={product?.strain_type ?? "na"}
              error={errors.strain_type}
            />
            <Field
              label="THC %"
              name="thc_percentage"
              type="number"
              inputMode="decimal"
              step="0.1"
              min="0"
              max="100"
              defaultValue={product?.thc_percentage ?? ""}
              placeholder="24.5"
              error={errors.thc_percentage}
            />
          </div>
          <TextArea
            label="Description"
            name="description"
            rows={4}
            defaultValue={product?.description ?? ""}
            placeholder="Aroma, effects, grow notes. Anything a buyer should know."
            error={errors.description}
          />
        </Section>

        <Section title="Pricing & stock">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Price ($)"
              name="price_per_unit"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              required
              defaultValue={product?.price_per_unit ?? ""}
              placeholder="0.00"
              error={errors.price_per_unit}
            />
            <Select label="Per" name="unit" options={UNITS} defaultValue={product?.unit ?? "g"} error={errors.unit} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="In stock"
              name="stock_qty"
              type="number"
              inputMode="numeric"
              min="0"
              step="1"
              required
              defaultValue={product?.stock_qty ?? ""}
              placeholder="0"
              error={errors.stock_qty}
            />
            <Field
              label="Minimum order"
              name="min_order_qty"
              type="number"
              inputMode="numeric"
              min="1"
              step="1"
              defaultValue={product?.min_order_qty ?? ""}
              placeholder="None"
              error={errors.min_order_qty}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="SKU" name="sku" defaultValue={product?.sku ?? ""} placeholder="Optional" error={errors.sku} />
            <Select
              label="Container"
              name="container_type"
              options={CONTAINER_TYPES}
              defaultValue={product?.container_type ?? "none"}
              error={errors.container_type}
            />
          </div>
        </Section>
      </div>

      <aside className="space-y-10">
        <Section title="Photo">
          <MediaPicker
            kind="image"
            accept="image/jpeg,image/png,image/webp"
            url={imageUrl}
            busy={uploading === "image"}
            error={uploadError.image ?? errors.image_url}
            onFile={(f) => upload("image", f)}
            onRemove={() => setImageUrl("")}
          />
        </Section>

        <Section title="Test results">
          <MediaPicker
            kind="coa"
            accept="application/pdf,image/jpeg,image/png"
            url={coaUrl}
            busy={uploading === "coa"}
            error={uploadError.coa ?? errors.test_results_url}
            onFile={(f) => upload("coa", f)}
            onRemove={() => setCoaUrl("")}
          />
        </Section>

        <Section title="Visibility">
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              name="is_active"
              defaultChecked={product?.is_active ?? true}
              className="mt-0.5 size-4 cursor-pointer accent-sunset"
            />
            <span className="text-[14px]">
              <span className="block font-medium">Visible to buyers</span>
              <span className="block text-ink-soft">Uncheck to keep it as a draft.</span>
            </span>
          </label>
        </Section>

        <div className="space-y-3 lg:sticky lg:top-28">
          <SubmitButton pending={pending || uploading !== null} pendingLabel={uploading ? "Uploading…" : "Saving…"}>
            {product ? "Save changes" : "Add product"}
          </SubmitButton>
          <Link
            href="/seller/products"
            className="block text-center text-sm text-ink-soft underline decoration-line underline-offset-4 hover:text-sunset"
          >
            Cancel
          </Link>
        </div>
      </aside>
    </form>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="border-b border-line pb-2 font-display text-xl">{title}</h2>
      {children}
    </section>
  );
}

function MediaPicker({
  kind,
  accept,
  url,
  busy,
  error,
  onFile,
  onRemove,
}: {
  kind: MediaKind;
  accept: string;
  url: string;
  busy: boolean;
  error?: string;
  onFile: (file: File | undefined) => void;
  onRemove: () => void;
}) {
  const id = `${kind}-file`;
  const isImage = kind === "image";

  return (
    <div>
      {url && isImage && (
        // eslint-disable-next-line @next/next/no-img-element -- user-uploaded, arbitrary dimensions
        <img src={url} alt="" className="mb-3 aspect-square w-full rounded-[3px] border border-line object-cover" />
      )}
      {url && !isImage && (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="mb-3 block truncate text-sm text-sunset underline underline-offset-4 hover:text-sunset-hover"
        >
          View current file &#8599;
        </a>
      )}

      <Label htmlFor={id}>{url ? "Replace" : isImage ? "Upload a photo" : "Upload a COA"}</Label>
      <label
        className={`mt-2 flex cursor-pointer items-center justify-between gap-3 rounded-[3px] border border-dashed px-3.5 py-3 text-[14px] transition-colors hover:border-sunset has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-sunset ${
          error ? "border-danger" : "border-ink-soft/40 bg-field"
        }`}
      >
        <input
          id={id}
          type="file"
          accept={accept}
          className="sr-only"
          disabled={busy}
          onChange={(e) => {
            onFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        <span className="text-ink-soft">{busy ? "Uploading…" : isImage ? "JPG, PNG or WebP" : "PDF, JPG or PNG"}</span>
        <span className="font-mono text-[11px] tracking-[0.12em] text-sunset uppercase">Browse</span>
      </label>
      <FieldError id={`${id}-error`} error={error} />

      {url && (
        <button type="button" onClick={onRemove} className="mt-2 cursor-pointer text-[13px] text-ink-soft hover:text-danger">
          Remove
        </button>
      )}
    </div>
  );
}
