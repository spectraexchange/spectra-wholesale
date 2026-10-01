"use client";

import { useState, useTransition } from "react";
import { NEXT_STATUS, type OrderStatus } from "@/lib/orders";
import { setDeliveryDate, setPaymentStatus, updateOrderStatus, type OrderActionResult } from "./actions";

const PRIMARY =
  "cursor-pointer rounded-[3px] bg-sunset px-5 py-3 text-[15px] font-semibold text-on-sunset shadow-[3px_3px_0_0_var(--press)] transition-[background-color,transform,box-shadow] duration-100 hover:bg-sunset-hover active:translate-x-[3px] active:translate-y-[3px] active:shadow-none disabled:cursor-wait disabled:opacity-60";
const SECONDARY =
  "cursor-pointer rounded-[3px] border border-line px-4 py-2.5 text-[14px] font-medium transition-colors hover:border-ink disabled:cursor-wait disabled:opacity-60";

const ACTION_LABEL: Partial<Record<OrderStatus, string>> = {
  confirmed: "Confirm order",
  shipped: "Mark out for delivery",
  delivered: "Mark delivered",
};

export function OrderActions({
  orderId,
  status,
  deliveryDate,
  paid,
}: {
  orderId: string;
  status: OrderStatus;
  deliveryDate: string | null;
  paid: boolean;
}) {
  const [date, setDate] = useState(deliveryDate ?? "");
  const [result, setResult] = useState<OrderActionResult>({});
  const [pending, startTransition] = useTransition();
  const run = (fn: () => Promise<OrderActionResult>) => startTransition(async () => setResult(await fn()));

  const next = NEXT_STATUS[status].filter((s) => s !== "cancelled");
  const canCancel = NEXT_STATUS[status].includes("cancelled");
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
      {status !== "cancelled" && status !== "delivered" && (
        <div>
          <label htmlFor="delivery-date" className="font-mono text-[11px] tracking-[0.16em] text-ink-soft uppercase">
            Delivery date
          </label>
          <div className="mt-2 flex gap-2">
            <input
              id="delivery-date"
              type="date"
              min={today}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-[3px] border border-line bg-field px-3 py-2.5 text-[15px] focus:border-sunset focus:outline-none"
            />
            {status !== "pending" && date && date !== deliveryDate && (
              <button type="button" disabled={pending} onClick={() => run(() => setDeliveryDate(orderId, date))} className={SECONDARY}>
                Save
              </button>
            )}
          </div>
          {status === "pending" && <p className="mt-1.5 text-[12px] text-ink-soft">Included in the confirmation email.</p>}
        </div>
      )}

      {next.length > 0 && (
        <div className="flex flex-col gap-3">
          {next.map((s, i) => (
            <button
              key={s}
              type="button"
              disabled={pending || (s === "confirmed" && !date)}
              onClick={() => run(() => updateOrderStatus(orderId, s, s === "confirmed" ? date : undefined))}
              className={i === 0 ? PRIMARY : SECONDARY}
            >
              {ACTION_LABEL[s]}
            </button>
          ))}
          {status === "pending" && !date && <p className="text-[12px] text-ink-soft">Pick a delivery date to confirm.</p>}
        </div>
      )}

      <div className="flex items-center justify-between gap-4 border-t border-line pt-5">
        <p className="text-[14px]">
          Payment: <span className={paid ? "text-success" : "text-ink-soft"}>{paid ? "Paid" : "Unpaid"}</span>
        </p>
        <button type="button" disabled={pending} onClick={() => run(() => setPaymentStatus(orderId, !paid))} className={SECONDARY}>
          {paid ? "Mark unpaid" : "Mark paid"}
        </button>
      </div>

      {canCancel && (
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (confirm("Cancel this order? Stock goes back into your catalog and the buyer is emailed.")) run(() => updateOrderStatus(orderId, "cancelled"));
          }}
          className="cursor-pointer text-[13px] text-ink-soft underline decoration-line underline-offset-4 hover:text-danger disabled:opacity-50"
        >
          Cancel order
        </button>
      )}

      {result.ok && <p role="status" className="text-[13px] text-success">{result.ok}</p>}
      {result.error && <p role="alert" className="text-[13px] text-danger">{result.error}</p>}
    </div>
  );
}
