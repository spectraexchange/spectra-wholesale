"use client";

import { useState, useTransition } from "react";
import { addToCart } from "./cart/actions";

export function AddToCart({
  productId,
  minQty,
  stock,
  unit,
  size = "sm",
}: {
  productId: string;
  minQty: number;
  stock: number;
  unit: string;
  size?: "sm" | "lg";
}) {
  const [quantity, setQuantity] = useState(String(Math.min(minQty, Math.max(stock, 1))));
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  if (stock <= 0) return <p className="text-[13px] text-danger">Out of stock</p>;

  const large = size === "lg";

  return (
    <form
      // Our own messages (minimum, stock) replace the browser's validation tooltip
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        const qty = Number(quantity);
        if (!Number.isInteger(qty) || qty < 1) return setMessage({ tone: "error", text: "Enter a whole number." });
        if (qty < minQty) return setMessage({ tone: "error", text: `Minimum order is ${minQty}.` });
        if (qty > stock) return setMessage({ tone: "error", text: `Only ${stock} available.` });
        startTransition(async () => {
          const result = await addToCart(productId, qty);
          setMessage(result.error ? { tone: "error", text: result.error } : { tone: "ok", text: result.ok ?? "Added" });
        });
      }}
    >
      <div className="flex items-stretch gap-2">
        <label className="sr-only" htmlFor={`qty-${productId}`}>
          Quantity ({unit})
        </label>
        <input
          id={`qty-${productId}`}
          type="number"
          inputMode="numeric"
          min={minQty}
          max={stock}
          step={1}
          value={quantity}
          onChange={(e) => {
            setQuantity(e.target.value);
            setMessage(null);
          }}
          className={`rounded-[3px] border border-line bg-field text-center font-mono text-ink focus:border-sunset focus:outline-none ${large ? "w-24 py-3 text-[15px]" : "w-16 py-2 text-[13px]"}`}
        />
        <button
          type="submit"
          disabled={pending}
          className={`flex-1 cursor-pointer rounded-[3px] bg-sunset font-semibold text-on-sunset shadow-[2px_2px_0_0_var(--press)] transition-[background-color,transform,box-shadow] duration-100 hover:bg-sunset-hover active:translate-x-[2px] active:translate-y-[2px] active:shadow-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sunset disabled:cursor-wait disabled:opacity-70 ${large ? "px-6 py-3 text-[15px]" : "px-3 py-2 text-[13px]"}`}
        >
          {pending ? "Adding…" : "Add to cart"}
        </button>
      </div>
      <p
        role="status"
        className={`mt-1.5 min-h-[1.25rem] text-[12px] ${message?.tone === "error" ? "text-danger" : "text-success"}`}
      >
        {message?.text}
      </p>
    </form>
  );
}
