import { Resend } from "resend";

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

export async function sendEmail(opts: { to: string; subject: string; html: string; from?: string }) {
  const { error } = await resend.emails.send({
    from: opts.from ?? "Spectra Wholesale <info@spectrawholesale.com>",
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
  });
  return { error: error?.message };
}

// Shared shell in the login page's palette. `body` must already be escaped.
function layout(body: string) {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#030a14;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#f7efdc;border-radius:6px;overflow:hidden;">
    <div style="padding:26px 36px;border-bottom:1px solid #d9cba8;">
      <p style="margin:0;font-family:Georgia,serif;font-size:22px;color:#1b1813;">Spectra Wholesale</p>
      <p style="margin:4px 0 0;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#5a5246;">Alaska cannabis wholesale</p>
    </div>
    <div style="padding:32px 36px;color:#1b1813;font-size:15px;line-height:1.55;">${body}</div>
    <div style="padding:18px 36px;border-top:1px solid #d9cba8;font-size:12px;color:#5a5246;">
      Questions? <a href="mailto:info@spectrawholesale.com" style="color:#c4461a;">info@spectrawholesale.com</a>
    </div>
  </div>
</body></html>`;
}

function button(href: string, label: string) {
  return `<a href="${escapeHtml(href)}" style="display:inline-block;background:#c4461a;color:#f7efdc;text-decoration:none;padding:13px 28px;border-radius:3px;font-weight:600;font-size:15px;">${label} &rarr;</a>`;
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
