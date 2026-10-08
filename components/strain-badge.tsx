import { strainLabel } from "@/lib/catalog";

const TONE: Record<string, string> = {
  indica: "border-indica/45 bg-indica/10 text-indica",
  indica_dom: "border-indica/45 text-indica",
  hybrid: "border-hybrid/45 bg-hybrid/10 text-hybrid",
  sativa_dom: "border-sativa/45 text-sativa",
  sativa: "border-sativa/45 bg-sativa/10 text-sativa",
};

// Strain type + THC, shown wherever a product is listed. Pure strains get a
// filled tag, hybrids an outlined one in the dominant side's color.
export function StrainInfo({ strain, thc, size = "sm" }: { strain: string; thc: number | null; size?: "sm" | "lg" }) {
  const tone = TONE[strain];
  if (!tone && thc === null) return null;
  const text = size === "lg" ? "text-[12px] px-2 py-1" : "text-[10px] px-1.5 py-0.5";

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      {tone && (
        <span className={`rounded-[3px] border font-mono leading-none font-medium tracking-[0.12em] whitespace-nowrap uppercase ${text} ${tone}`}>
          {strainLabel(strain)}
        </span>
      )}
      {thc !== null && (
        <span className={`font-mono whitespace-nowrap ${size === "lg" ? "text-[15px]" : "text-[13px]"}`}>
          {thc}% <span className="text-ink-soft">THC</span>
        </span>
      )}
    </span>
  );
}
