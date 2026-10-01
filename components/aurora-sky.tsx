// Night sky with a drifting aurora band and twinkling stars.
// Aurora tuning carried over from the previous build: purple + green only (gold washed
// the band out toward gray), layers overlap enough to read as one band (green left, purple right so the hues stay distinct)
// confined to the top third, and blur is kept low so the color stays saturated.

const AURORA_LAYERS = [
  { gradient: "ellipse 60% 75% at 30% 15%, rgba(0,230,150,0.6) 0%, transparent 70%", blur: 24, animation: "aurora-a 14s" },
  { gradient: "ellipse 60% 70% at 68% 12%, rgba(150,90,255,0.7) 0%, transparent 65%", blur: 26, animation: "aurora-b 18s" },
  { gradient: "ellipse 45% 55% at 78% 22%, rgba(120,30,235,0.5) 0%, transparent 65%", blur: 34, animation: "aurora-c 16s" },
  { gradient: "ellipse 40% 50% at 45% 20%, rgba(30,235,160,0.45) 0%, transparent 58%", blur: 18, animation: "aurora-a 14s -7s" },
];

// Deterministic so server and client render the same sky.
function seeded(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

const STAR_GROUPS = (() => {
  const rand = seeded(42);
  const timings = ["twinkle-a 3.5s", "twinkle-b 5.1s", "twinkle-c 4.2s", "twinkle-a 6.3s", "twinkle-b 2.8s", "twinkle-c 7s"];
  return timings.map((animation) => {
    const stars = Array.from({ length: 9 }, () => {
      const size = rand() < 0.25 ? 1.5 : 1;
      // Bias stars toward the top of the sky
      return `radial-gradient(${size}px ${size}px at ${(rand() * 100).toFixed(1)}% ${(Math.pow(rand(), 1.4) * 85).toFixed(1)}%, #fff 0%, transparent 100%)`;
    });
    return { animation, backgroundImage: stars.join(",") };
  });
})();

export function AuroraSky({ className = "" }: { className?: string }) {
  return (
    <div aria-hidden="true" className={`aurora-sky pointer-events-none overflow-hidden bg-night ${className}`}>
      <div className="absolute inset-x-0 top-0 h-[34vh]">
        {AURORA_LAYERS.map((layer, i) => (
          <div
            key={i}
            className="absolute inset-0"
            style={{
              background: `radial-gradient(${layer.gradient})`,
              filter: `blur(${layer.blur}px)`,
              animation: `${layer.animation} ease-in-out infinite`,
            }}
          />
        ))}
      </div>

      {STAR_GROUPS.map((group, i) => (
        <div
          key={i}
          className="absolute inset-0"
          style={{ backgroundImage: group.backgroundImage, animation: `${group.animation} ease-in-out infinite` }}
        />
      ))}
    </div>
  );
}
