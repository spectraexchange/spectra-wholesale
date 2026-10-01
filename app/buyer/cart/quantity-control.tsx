"use client";

import { useState, useTransition } from "react";
import { removeFromCart, updateCartQuantity } from "./actions";

export function QuantityControl({ itemId, quantity, max, label }: { itemId: string; quantity: number; max: number; label: string }) {
  const [value, setValue] = useState(String(quantity));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const commit = () => {
    const qty = Number(value);
    if (qty === quantity) return;
    if (!Number.isInteger(qty) || qty < 0) {
      setError("Whole numbers only");
      setValue(String(quantity));
      return;
    }
    startTransition(async () => {
      const result = await updateCartQuantity(itemId, qty);
      setError(result.error ?? null);
    });
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-3">
        <label className="sr-only" htmlFor={`cart-${itemId}`}>
          Quantity of {label}
        </label>
        <input
          id={`cart-${itemId}`}
          type="number"
          inputMode="numeric"
          min={0}
          max={max || undefined}
          value={value}
          disabled={pending}
          onChange={(e) => setValue(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), commit())}
          className="w-20 rounded-[3px] border border-line bg-field py-2 text-center font-mono text-[14px] focus:border-sunset focus:outline-none disabled:opacity-60"
        />
        <button
          type="button"
          disabled={pending}
          onClick={() => startTransition(async () => void (await removeFromCart(itemId)))}
          className="cursor-pointer text-[13px] text-ink-soft underline decoration-line underline-offset-4 hover:text-danger disabled:opacity-50"
        >
          Remove
        </button>
      </div>
      {error && <p className="text-[12px] text-danger">{error}</p>}
    </div>
  );
}
