import { Resend } from "resend";
import { logError } from "@/lib/error-log";

const resend = new Resend(process.env.RESEND_API_KEY);

export const ADMIN_EMAIL = process.env.ADMIN_NOTIFY_EMAIL ?? "eric@spectrawholesale.com";

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function sendEmail(opts: { to: string; subject: string; html: string; from?: string; replyTo?: string }) {
  // RFC 2606 reserved domains can never receive mail; skip them (used by test accounts).
  if (/@(.+\.)?(example\.(com|org|net)|test|invalid)$/i.test(opts.to)) return { error: undefined };
  let message: string | undefined;
  try {
    const { error } = await resend.emails.send({
      from: opts.from ?? "Spectra Wholesale <info@spectrawholesale.com>",
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      ...(opts.replyTo && { replyTo: opts.replyTo }),
    });
    message = error?.message;
  } catch (err) {
    message = err instanceof Error ? err.message : String(err);
  }
  // Callers treat email as best effort, so failures are logged here or nowhere.
  if (message) await logError({ source: "email", message: `Email failed: ${message}`, detail: `To: ${opts.to}\nSubject: ${opts.subject}` });
  return { error: message };
}

// Shared shell in the login page's palette. `body` must already be escaped.
function layout(body: string) {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#030a14;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#faf8f4;border-radius:6px;overflow:hidden;">
    <div style="padding:26px 36px;border-bottom:1px solid #e0d9cc;">
      <p style="margin:0;font-family:Georgia,serif;font-size:22px;color:#1b1813;">Spectra Wholesale</p>
      <p style="margin:4px 0 0;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#5a5246;">Alaska cannabis wholesale</p>
    </div>
    <div style="padding:32px 36px;color:#1b1813;font-size:15px;line-height:1.55;">${body}</div>
    <div style="padding:18px 36px;border-top:1px solid #e0d9cc;font-size:12px;color:#5a5246;">
      Questions? <a href="mailto:info@spectrawholesale.com" style="color:#c4461a;">info@spectrawholesale.com</a>
    </div>
  </div>
</body></html>`;
}

function button(href: string, label: string) {
  return `<a href="${escapeHtml(href)}" style="display:inline-block;background:#c4461a;color:#faf8f4;text-decoration:none;padding:13px 28px;border-radius:3px;font-weight:600;font-size:15px;">${label} &rarr;</a>`;
}

export function inviteEmail(opts: { firstName: string; company: string; accountType: string; link: string }) {
  const kind = opts.accountType === "seller" ? "vendor" : "buyer";
  return layout(`
    <h1 style="margin:0 0 12px;font-family:Georgia,serif;font-weight:normal;font-size:26px;">You&rsquo;re approved, ${escapeHtml(opts.firstName)}.</h1>
    <p style="margin:0 0 12px;">${escapeHtml(opts.company)} is set up on Spectra Wholesale as a ${kind} account.</p>
    <p style="margin:0 0 28px;">Everything you sent with your request is already on file. All that&rsquo;s left is choosing a password.</p>
    <p style="margin:0 0 28px;">${button(opts.link, "Set your password")}</p>
    <p style="margin:0;font-size:13px;color:#5a5246;">This link expires in 24 hours. If it runs out, reply to this email and we&rsquo;ll send a fresh one.</p>
  `);
}

export function newRequestEmail(opts: { name: string; company: string; accountType: string; city: string; reviewUrl: string }) {
  const kind = opts.accountType === "seller" ? "Vendor" : "Buyer";
  return layout(`
    <h1 style="margin:0 0 12px;font-family:Georgia,serif;font-weight:normal;font-size:24px;">New access request</h1>
    <p style="margin:0 0 24px;"><strong>${escapeHtml(opts.company)}</strong> (${kind}, ${escapeHtml(opts.city)})<br>Submitted by ${escapeHtml(opts.name)}</p>
    <p style="margin:0;">${button(opts.reviewUrl, "Review request")}</p>
  `);
}

export function licenseUpdatedEmail(opts: { company: string; document: string; name: string; reviewUrl: string }) {
  return layout(`
    <h1 style="margin:0 0 12px;font-family:Georgia,serif;font-weight:normal;font-size:24px;">License document updated</h1>
    <p style="margin:0 0 24px;"><strong>${escapeHtml(opts.company)}</strong> uploaded a new ${escapeHtml(opts.document.toLowerCase())}.<br>Uploaded by ${escapeHtml(opts.name)}</p>
    <p style="margin:0;">${button(opts.reviewUrl, "Review document")}</p>
  `);
}

type EmailLine ={ name: string; qty: string; lineTotal: string };

function linesTable(lines: EmailLine[], total: string) {
  const rows = lines
    .map(
      (l) => `<tr>
        <td style="padding:8px 0;border-bottom:1px solid #e0d9cc;">${escapeHtml(l.name)}</td>
        <td style="padding:8px 0;border-bottom:1px solid #e0d9cc;text-align:right;color:#5a5246;white-space:nowrap;">${escapeHtml(l.qty)}</td>
        <td style="padding:8px 0 8px 16px;border-bottom:1px solid #e0d9cc;text-align:right;font-family:Menlo,monospace;white-space:nowrap;">${escapeHtml(l.lineTotal)}</td>
      </tr>`,
    )
    .join("");
  return `<table style="width:100%;border-collapse:collapse;font-size:14px;margin:0 0 24px;">${rows}
    <tr><td colspan="2" style="padding:12px 0 0;font-weight:600;">Total</td>
    <td style="padding:12px 0 0;text-align:right;font-family:Menlo,monospace;font-weight:600;">${escapeHtml(total)}</td></tr></table>`;
}

export function newOrderEmail(opts: {
  orderNumber: string;
  buyer: string;
  deliverTo: string;
  notes: string | null;
  lines: EmailLine[];
  total: string;
  link: string;
}) {
  return layout(`
    <h1 style="margin:0 0 6px;font-family:Georgia,serif;font-weight:normal;font-size:26px;">New order ${escapeHtml(opts.orderNumber)}</h1>
    <p style="margin:0 0 24px;color:#5a5246;">From <strong style="color:#1b1813;">${escapeHtml(opts.buyer)}</strong> &middot; deliver to ${escapeHtml(opts.deliverTo)}</p>
    ${linesTable(opts.lines, opts.total)}
    ${opts.notes ? `<p style="margin:0 0 24px;padding:12px 14px;border-left:3px solid #c4461a;background:#f1ede5;">${escapeHtml(opts.notes)}</p>` : ""}
    <p style="margin:0;">${button(opts.link, "Review and confirm")}</p>
  `);
}

const STATUS_COPY: Record<string, { heading: string; body: string }> = {
  pending: { heading: "Order placed", body: "We sent it to the vendor. You’ll get an email when they confirm." },
  confirmed: { heading: "Order confirmed", body: "The vendor confirmed your order." },
  shipped: { heading: "Out for delivery", body: "Your order is on its way." },
  delivered: { heading: "Delivered", body: "The vendor marked your order delivered." },
  cancelled: { heading: "Order cancelled", body: "This order was cancelled. Reach out to the vendor with any questions." },
};

export function orderUpdateEmail(opts: {
  status: string;
  orderNumber: string;
  vendor: string;
  deliveryDate: string | null;
  lines: EmailLine[];
  total: string;
  link: string;
}) {
  const copy = STATUS_COPY[opts.status] ?? STATUS_COPY.pending;
  return layout(`
    <p style="margin:0 0 6px;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#5a5246;">${escapeHtml(opts.orderNumber)} &middot; ${escapeHtml(opts.vendor)}</p>
    <h1 style="margin:0 0 12px;font-family:Georgia,serif;font-weight:normal;font-size:26px;">${copy.heading}</h1>
    <p style="margin:0 0 ${opts.deliveryDate ? "8px" : "24px"};">${copy.body}</p>
    ${opts.deliveryDate ? `<p style="margin:0 0 24px;"><strong>Delivery:</strong> ${escapeHtml(opts.deliveryDate)}</p>` : ""}
    ${linesTable(opts.lines, opts.total)}
    <p style="margin:0;">${button(opts.link, "View order")}</p>
  `);
}

export function passwordResetEmail(opts: { firstName: string; link: string }) {
  return layout(`
    <h1 style="margin:0 0 12px;font-family:Georgia,serif;font-weight:normal;font-size:26px;">Reset your password</h1>
    <p style="margin:0 0 12px;">Hi ${escapeHtml(opts.firstName)}, Spectra support sent you a link to choose a new password.</p>
    <p style="margin:0 0 28px;">${button(opts.link, "Choose a new password")}</p>
    <p style="margin:0;font-size:13px;color:#5a5246;">This link expires in 24 hours. If you didn&rsquo;t expect this, you can ignore it and your password stays the same.</p>
  `);
}

// ── Support ──────────────────────────────────────────────────────────────────

function quote(body: string) {
  return `<div style="margin:0 0 24px;padding:12px 14px;border-left:3px solid #c4461a;background:#f1ede5;white-space:pre-wrap;">${escapeHtml(body)}</div>`;
}

/** To Spectra: a new ticket, or a customer reply on one. */
export function ticketToStaffEmail(opts: { ref: string; subject: string; from: string; company: string | null; category: string; body: string; isReply: boolean; link: string }) {
  return layout(`
    <p style="margin:0 0 6px;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#5a5246;">${escapeHtml(opts.ref)} &middot; ${escapeHtml(opts.category)}</p>
    <h1 style="margin:0 0 8px;font-family:Georgia,serif;font-weight:normal;font-size:24px;">${opts.isReply ? "New reply" : "New support request"}: ${escapeHtml(opts.subject)}</h1>
    <p style="margin:0 0 20px;color:#5a5246;">From <strong style="color:#1b1813;">${escapeHtml(opts.from)}</strong>${opts.company ? ` &middot; ${escapeHtml(opts.company)}` : ""}</p>
    ${quote(opts.body)}
    <p style="margin:0;">${button(opts.link, "Open ticket")}</p>
  `);
}

/** To the customer: we got it, or Spectra replied. */
export function ticketToCustomerEmail(opts: { ref: string; subject: string; firstName: string; body: string | null; link: string | null }) {
  const intro = opts.body
    ? `Spectra support replied to your request.`
    : `We got your request and will get back to you soon, usually within one business day.`;
  const next = opts.link
    ? `<p style="margin:0;">${button(opts.link, opts.body ? "Reply" : "View request")}</p>`
    : `<p style="margin:0;font-size:14px;color:#5a5246;">Reply to this email to add anything. Please keep ${escapeHtml(opts.ref)} in the subject.</p>`;
  return layout(`
    <p style="margin:0 0 6px;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#5a5246;">Support ${escapeHtml(opts.ref)}</p>
    <h1 style="margin:0 0 12px;font-family:Georgia,serif;font-weight:normal;font-size:24px;">${escapeHtml(opts.subject)}</h1>
    <p style="margin:0 0 20px;">Hi ${escapeHtml(opts.firstName)}, ${intro}</p>
    ${opts.body ? quote(opts.body) : ""}
    ${next}
  `);
}
