import { cn } from "@/lib/utils";

type AuthHeroIllustrationProps = {
  className?: string;
};

export function AuthHeroIllustration({ className }: AuthHeroIllustrationProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "relative h-full w-full overflow-hidden rounded-[22px] border border-[hsl(var(--border)/0.62)] bg-[hsl(var(--card)/0.68)] shadow-[inset_0_1px_0_rgba(255,255,255,0.65),0_14px_28px_rgba(45,70,100,0.12)] backdrop-blur-[7px]",
        className,
      )}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_14%,rgba(77,108,150,0.14),transparent_38%),radial-gradient(circle_at_85%_42%,rgba(84,115,154,0.11),transparent_44%),radial-gradient(circle_at_20%_84%,rgba(182,94,123,0.08),transparent_34%),linear-gradient(160deg,rgba(242,247,253,0.82),rgba(220,232,247,0.56))]" />
      <div className="absolute inset-0 opacity-[0.045] bg-[repeating-radial-gradient(circle_at_0_0,rgba(70,100,137,0.72)_0,rgba(70,100,137,0.72)_0.45px,transparent_0.95px,transparent_3.2px)]" />
      <div className="absolute inset-0 bg-[repeating-linear-gradient(to_right,rgba(80,109,146,0.08)_0,rgba(80,109,146,0.08)_1px,transparent_1px,transparent_20px),repeating-linear-gradient(to_bottom,rgba(80,109,146,0.08)_0,rgba(80,109,146,0.08)_1px,transparent_1px,transparent_20px)]" />
      <div className="absolute inset-0 bg-[repeating-linear-gradient(to_right,rgba(73,102,141,0.05)_0,rgba(73,102,141,0.05)_1px,transparent_1px,transparent_104px),repeating-linear-gradient(to_bottom,rgba(73,102,141,0.05)_0,rgba(73,102,141,0.05)_1px,transparent_1px,transparent_104px)]" />

      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 1200 760"
        preserveAspectRatio="xMidYMid slice"
        role="presentation"
      >
        <defs>
          <linearGradient id="isoTop" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(245,250,255,0.95)" />
            <stop offset="100%" stopColor="rgba(201,220,244,0.78)" />
          </linearGradient>
          <linearGradient id="isoFront" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(138,165,199,0.52)" />
            <stop offset="100%" stopColor="rgba(101,132,172,0.26)" />
          </linearGradient>
          <linearGradient id="isoSide" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(95,125,164,0.34)" />
            <stop offset="100%" stopColor="rgba(71,99,136,0.2)" />
          </linearGradient>
          <linearGradient id="isoLayerA" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(124,154,193,0.42)" />
            <stop offset="100%" stopColor="rgba(85,115,154,0.22)" />
          </linearGradient>
          <linearGradient id="isoLayerB" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(182,99,128,0.22)" />
            <stop offset="100%" stopColor="rgba(136,84,129,0.1)" />
          </linearGradient>
          <filter id="isoSoftShadow" x="-20%" y="-20%" width="150%" height="160%">
            <feGaussianBlur stdDeviation="10" />
          </filter>
          <filter id="isoGlow" x="-20%" y="-20%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="8" />
          </filter>
        </defs>

        <g opacity="0.26" filter="url(#isoSoftShadow)">
          <ellipse cx="642" cy="558" rx="310" ry="84" fill="rgba(55,83,116,0.35)" />
        </g>

        <g className="auth-hero-iso-float" transform="translate(0 8)">
          <path d="M354 394 L640 268 L892 392 L606 518 Z" fill="url(#isoTop)" stroke="rgba(88,118,154,0.38)" strokeWidth="2" />
          <path d="M606 518 L892 392 L892 498 L606 626 Z" fill="url(#isoSide)" stroke="rgba(74,103,140,0.32)" strokeWidth="1.8" />
          <path d="M354 394 L606 518 L606 626 L354 502 Z" fill="url(#isoFront)" stroke="rgba(82,111,148,0.32)" strokeWidth="1.8" />

          <path d="M412 392 L640 292 L836 390 L608 492 Z" fill="rgba(255,255,255,0.56)" stroke="rgba(122,148,180,0.26)" strokeWidth="1.5" />
          <path d="M446 408 L640 322 L804 404 L610 488 Z" fill="rgba(222,236,252,0.52)" stroke="rgba(129,154,184,0.26)" strokeWidth="1.2" />
          <path d="M480 424 L640 352 L772 416 L612 488 Z" fill="rgba(203,222,245,0.48)" stroke="rgba(130,156,190,0.24)" strokeWidth="1.1" />

          <g transform="translate(740 280)">
            <path d="M0 44 C 0 18 26 0 62 0 C 98 0 124 18 124 44 C 124 72 98 92 62 92 C 26 92 0 72 0 44 Z" fill="rgba(244,248,255,0.76)" stroke="rgba(133,160,193,0.38)" strokeWidth="2" />
            <circle cx="30" cy="40" r="16" fill="rgba(124,155,195,0.32)" />
            <circle cx="62" cy="36" r="20" fill="rgba(155,182,214,0.34)" />
            <circle cx="89" cy="44" r="13" fill="rgba(190,108,136,0.2)" />
          </g>

          <g transform="translate(260 316)">
            <path d="M0 70 L120 18 L226 68 L106 120 Z" fill="url(#isoLayerA)" stroke="rgba(98,127,164,0.34)" strokeWidth="1.5" />
            <path d="M56 110 L176 58 L250 94 L130 148 Z" fill="url(#isoLayerB)" stroke="rgba(131,99,142,0.28)" strokeWidth="1.3" />
            <path d="M132 166 L252 112 L316 142 L196 196 Z" fill="rgba(118,149,189,0.3)" stroke="rgba(96,126,164,0.28)" strokeWidth="1.2" />
          </g>
        </g>

        <g className="auth-hero-iso-breathe" fill="none" strokeLinecap="round">
          <path d="M210 470 C 300 430, 390 420, 504 448 C 590 470, 700 472, 804 438" stroke="rgba(74,104,142,0.24)" strokeWidth="1.5" />
          <path d="M228 516 C 338 472, 446 470, 566 498 C 672 524, 770 520, 868 486" stroke="rgba(89,118,154,0.21)" strokeWidth="1.25" />
          <path d="M252 560 C 370 520, 474 524, 598 550 C 702 572, 790 570, 878 542" stroke="rgba(101,129,164,0.18)" strokeWidth="1.1" />
        </g>

        <g className="auth-hero-iso-breathe">
          <line x1="322" y1="348" x2="392" y2="312" stroke="rgba(94,123,161,0.24)" strokeWidth="1.2" />
          <line x1="392" y1="312" x2="462" y2="338" stroke="rgba(94,123,161,0.24)" strokeWidth="1.2" />
          <line x1="814" y1="310" x2="892" y2="346" stroke="rgba(98,127,165,0.24)" strokeWidth="1.2" />
          <line x1="892" y1="346" x2="962" y2="316" stroke="rgba(98,127,165,0.24)" strokeWidth="1.2" />
          <circle cx="322" cy="348" r="3.2" fill="rgba(94,123,161,0.26)" />
          <circle cx="392" cy="312" r="2.6" fill="rgba(94,123,161,0.25)" />
          <circle cx="462" cy="338" r="3.1" fill="rgba(170,96,129,0.22)" />
          <circle cx="814" cy="310" r="2.8" fill="rgba(98,127,165,0.25)" />
          <circle cx="892" cy="346" r="3.2" fill="rgba(98,127,165,0.25)" />
          <circle cx="962" cy="316" r="2.6" fill="rgba(171,98,130,0.2)" />
        </g>

        <g opacity="0.5" filter="url(#isoGlow)">
          <ellipse cx="742" cy="258" rx="96" ry="46" fill="rgba(173,198,229,0.22)" />
          <ellipse cx="852" cy="270" rx="60" ry="28" fill="rgba(190,111,137,0.14)" />
        </g>
      </svg>

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0)_60%,rgba(255,255,255,0.14)_100%)]" />
    </div>
  );
}
