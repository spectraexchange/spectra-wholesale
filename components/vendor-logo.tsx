// A vendor's brand logo, or their initials when they haven't uploaded one.
// Logos sit on a white square in both themes (deliberately not a theme token):
// most are dark artwork on white or transparent and vanish on night mode.

const SIZES = {
  xs: { box: "size-6 p-0.5", text: "text-[10px]" },
  sm: { box: "size-11 p-1", text: "text-[15px]" },
  lg: { box: "size-20 p-2", text: "text-2xl" },
} as const;

export function VendorLogo({ name, logoUrl, size = "sm" }: { name: string; logoUrl: string | null | undefined; size?: keyof typeof SIZES }) {
  const s = SIZES[size];
  if (logoUrl) {
    return (
      <span className={`grid shrink-0 place-items-center overflow-hidden rounded-[3px] border border-line bg-white ${s.box}`}>
        {/* eslint-disable-next-line @next/next/no-img-element -- vendor-uploaded, arbitrary dimensions */}
        <img src={logoUrl} alt={`${name} logo`} className="max-h-full max-w-full object-contain" />
      </span>
    );
  }
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
  return (
    <span aria-hidden className={`grid shrink-0 place-items-center rounded-[3px] border border-line bg-paper-deep font-display text-ink-soft ${s.box} ${s.text}`}>
      {initials}
    </span>
  );
}
