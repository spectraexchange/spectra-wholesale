// Retro Alaskan midnight-sun scene, drawn in the logo's palette.
// Swap for a photo later by replacing this component in app/(auth)/layout.tsx.

const SPRUCE =
  "M0 0 L-9 22 L-4 22 L-14 44 L-6 44 L-19 70 L-3 70 L-3 84 L3 84 L3 70 L19 70 L6 44 L14 44 L4 22 L9 22 Z";

const STARS: [number, number, number][] = [
  [140, 90, 1.6], [310, 160, 1.1], [470, 60, 1.3], [620, 210, 0.9],
  [780, 110, 1.5], [930, 40, 1.0], [1090, 150, 1.2], [1240, 80, 1.6],
  [1400, 190, 1.0], [1520, 70, 1.3], [60, 250, 1.0], [880, 260, 0.8],
];

// [x, baseline y, scale]
const TREES: [number, number, number][] = [
  [40, 905, 1.5], [95, 925, 1.9], [150, 900, 1.3], [205, 930, 2.1],
  [330, 950, 1.2], [1180, 945, 1.3], [1260, 925, 1.8], [1320, 940, 1.4],
  [1390, 915, 2.2], [1460, 935, 1.6], [1530, 910, 2.0], [1585, 930, 1.5],
];

export function MidnightSunScene({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 1600 1000"
      preserveAspectRatio="xMidYMax slice"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0f1e25" />
          <stop offset="0.38" stopColor="#1d3f47" />
          <stop offset="0.58" stopColor="#7a4a3a" />
          <stop offset="0.68" stopColor="#d9682c" />
          <stop offset="0.76" stopColor="#f2a531" />
        </linearGradient>
        <linearGradient id="sun" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fbeaa8" />
          <stop offset="0.45" stopColor="#f6bb4a" />
          <stop offset="1" stopColor="#e8551c" />
        </linearGradient>
        <linearGradient id="lake" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e2793a" />
          <stop offset="1" stopColor="#1d3f47" />
        </linearGradient>
        {/* Classic striped-sunset cutouts across the lower half of the sun */}
        <mask id="sun-stripes">
          <rect width="1600" height="1000" fill="white" />
          <rect x="0" y="478" width="1600" height="4" fill="black" />
          <rect x="0" y="497" width="1600" height="6" fill="black" />
          <rect x="0" y="515" width="1600" height="8" fill="black" />
          <rect x="0" y="533" width="1600" height="11" fill="black" />
        </mask>
        <filter id="grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" />
          <feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.55 0" />
        </filter>
        <path id="spruce" d={SPRUCE} />
      </defs>

      <rect width="1600" height="1000" fill="url(#sky)" />

      <g fill="#fbeaa8">
        {STARS.map(([x, y, r]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r={r} opacity="0.75" />
        ))}
      </g>

      <circle cx="560" cy="640" r="250" fill="url(#sun)" mask="url(#sun-stripes)" />

      {/* Far range, with a Denali-ish high peak */}
      <path
        fill="#3a6a70"
        d="M0 640 L90 590 L170 620 L260 540 L340 585 L430 500 L520 560 L600 520 L700 600 L790 560 L880 610 L980 530 L1060 470 L1130 520 L1180 495 L1270 560 L1350 530 L1440 590 L1530 560 L1600 590 L1600 1000 L0 1000 Z"
      />
      <path fill="#f7efdc" opacity="0.55" d="M1060 470 L1032 492 L1046 490 L1056 500 L1068 488 L1082 494 Z" />
      <path fill="#f7efdc" opacity="0.4" d="M430 500 L410 516 L424 514 L432 522 L442 512 L452 516 Z" />

      {/* Mid range */}
      <path
        fill="#24515a"
        d="M0 700 L120 640 L230 690 L320 650 L420 700 L540 660 L650 710 L760 670 L870 720 L990 650 L1100 700 L1220 640 L1330 690 L1460 650 L1600 700 L1600 1000 L0 1000 Z"
      />

      {/* Lake catching the sun */}
      <rect x="0" y="760" width="1600" height="240" fill="url(#lake)" />
      <g fill="#fbeaa8" opacity="0.55">
        <rect x="430" y="772" width="260" height="3" rx="1.5" />
        <rect x="460" y="790" width="200" height="3" rx="1.5" />
        <rect x="495" y="810" width="130" height="3" rx="1.5" />
        <rect x="525" y="832" width="70" height="3" rx="1.5" />
      </g>

      {/* Near shoreline */}
      <path
        fill="#143840"
        d="M0 840 L140 820 L300 860 L420 880 L0 1000 Z M1600 830 L1450 815 L1300 850 L1120 900 L1100 1000 L1600 1000 Z"
      />
      <path fill="#0c2328" d="M0 900 Q300 870 520 1000 L0 1000 Z M1600 880 Q1300 880 1060 1000 L1600 1000 Z" />

      <g fill="#0c2328">
        {TREES.map(([x, y, s]) => (
          <use key={`${x}-${y}`} href="#spruce" transform={`translate(${x} ${y - 84 * s}) scale(${s})`} />
        ))}
      </g>

      <rect width="1600" height="1000" filter="url(#grain)" opacity="0.18" />
    </svg>
  );
}
