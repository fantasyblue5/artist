import Image from "next/image";

import { cn } from "@/lib/utils";

type AuthHeroIllustrationProps = {
  className?: string;
};

export function AuthHeroIllustration({ className }: AuthHeroIllustrationProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "relative flex h-full w-full items-center justify-center overflow-hidden rounded-[22px] border border-[hsl(var(--border)/0.62)] bg-[linear-gradient(160deg,rgba(244,248,253,0.92),rgba(225,235,247,0.82))] shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_14px_28px_rgba(45,70,100,0.12)] backdrop-blur-[7px]",
        className,
      )}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(115,161,216,0.18),transparent_32%),radial-gradient(circle_at_82%_24%,rgba(115,161,216,0.12),transparent_28%),radial-gradient(circle_at_50%_88%,rgba(65,139,214,0.1),transparent_34%)]" />
      <div className="absolute inset-0 opacity-[0.06] bg-[repeating-linear-gradient(to_right,rgba(80,109,146,0.1)_0,rgba(80,109,146,0.1)_1px,transparent_1px,transparent_22px),repeating-linear-gradient(to_bottom,rgba(80,109,146,0.1)_0,rgba(80,109,146,0.1)_1px,transparent_1px,transparent_22px)]" />

      <div className="relative z-10 flex h-full w-full items-center justify-center p-6 sm:p-8">
        <div className="relative aspect-square w-full max-w-[280px] sm:max-w-[320px] lg:max-w-[360px]">
          <Image
            src="/assets/auth/using-laptop.svg"
            alt=""
            fill
            priority
            sizes="(min-width: 1280px) 360px, (min-width: 640px) 320px, 280px"
            className="object-contain drop-shadow-[0_18px_36px_rgba(65,139,214,0.14)]"
          />
        </div>
      </div>

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0)_62%,rgba(255,255,255,0.12)_100%)]" />
    </div>
  );
}
