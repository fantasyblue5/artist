"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import type { AssetRecord, AssetType } from "@/lib/resource-types";

type AssetCoverProps = {
  asset: Pick<AssetRecord, "title" | "type" | "tags" | "coverImage" | "coverVariant">;
  className?: string;
};

function hashValue(input: string) {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) | 0;
  }
  return Math.abs(hash);
}

function paletteFor(type: AssetType, variantSeed: number) {
  const palettes: Record<AssetType, [string, string, string]> = {
    构图模板: ["#F3F7FC", "#D6E4F5", "#6B89AF"],
    色彩方案: ["#F8F0DF", "#C5D7F2", "#58749C"],
    光影参考: ["#F7FAFD", "#BCCDE2", "#465F86"],
    笔触纹理: ["#F2F5F8", "#D8E0E8", "#728AA8"],
    风格样本: ["#FBF8F4", "#DCCFC0", "#7E8FA9"],
    透视空间: ["#F4F8FC", "#D4DFEC", "#5C7699"],
  };

  const palette = palettes[type];
  if (variantSeed % 2 === 0) {
    return palette;
  }
  return [palette[1], palette[0], palette[2]] as [string, string, string];
}

function CompositionTemplate({ colors }: { colors: [string, string, string] }) {
  return (
    <div className="absolute inset-0 overflow-hidden rounded-[22px]" style={{ background: `linear-gradient(145deg, ${colors[0]}, ${colors[1]})` }}>
      <div className="absolute inset-5 rounded-[18px] border border-white/75" />
      <div className="absolute inset-x-10 inset-y-8 rounded-[14px] border border-white/55" />
      <div className="absolute left-[18%] top-0 h-full w-px bg-[rgba(92,118,153,0.28)]" />
      <div className="absolute left-[50%] top-0 h-full w-px bg-[rgba(92,118,153,0.28)]" />
      <div className="absolute top-[34%] left-0 h-px w-full bg-[rgba(92,118,153,0.25)]" />
      <div className="absolute right-8 top-8 h-16 w-16 rounded-2xl border border-white/70 bg-white/20 backdrop-blur-[2px]" />
    </div>
  );
}

function ColorPaletteCover({ colors }: { colors: [string, string, string] }) {
  return (
    <div className="absolute inset-0 overflow-hidden rounded-[22px]" style={{ background: `linear-gradient(155deg, ${colors[0]}, #ffffff 72%)` }}>
      <div className="absolute inset-x-6 top-7 flex h-10 gap-2">
        {[colors[2], "#9CB4CF", "#D69A7A", "#E7DCC6"].map((color) => (
          <div key={color} className="flex-1 rounded-2xl" style={{ backgroundColor: color }} />
        ))}
      </div>
      <div className="absolute inset-x-6 bottom-6 grid h-16 grid-cols-3 gap-2">
        {[colors[1], "#FAF7F1", "#6B7B95"].map((color) => (
          <div key={color} className="rounded-[18px]" style={{ backgroundColor: color }} />
        ))}
      </div>
      <div className="absolute left-6 top-24 h-px w-[56%] bg-[rgba(76,98,130,0.22)]" />
    </div>
  );
}

function LightReferenceCover({ colors }: { colors: [string, string, string] }) {
  return (
    <div
      className="absolute inset-0 overflow-hidden rounded-[22px]"
      style={{
        background: `radial-gradient(circle at 28% 26%, rgba(255,255,255,0.96), transparent 20%), radial-gradient(circle at 68% 54%, rgba(255,255,255,0.32), transparent 26%), linear-gradient(135deg, ${colors[2]}, ${colors[1]} 58%, ${colors[0]})`,
      }}
    >
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(23,34,52,0.12))]" />
      <div className="absolute inset-x-7 bottom-7 h-12 rounded-[20px] border border-white/18 bg-white/8" />
    </div>
  );
}

function BrushTextureCover({ colors }: { colors: [string, string, string] }) {
  return (
    <div className="absolute inset-0 overflow-hidden rounded-[22px]" style={{ background: `linear-gradient(145deg, ${colors[0]}, ${colors[1]})` }}>
      <div className="absolute inset-0 opacity-80" style={{ backgroundImage: "repeating-linear-gradient(167deg, rgba(91,116,150,0.06) 0px, rgba(91,116,150,0.06) 10px, transparent 10px, transparent 24px)" }} />
      <div className="absolute left-6 top-8 h-4 w-[62%] rounded-full bg-[rgba(92,118,153,0.52)]" />
      <div className="absolute left-10 top-16 h-5 w-[48%] rounded-full bg-[rgba(92,118,153,0.34)]" />
      <div className="absolute left-8 top-28 h-3 w-[70%] rounded-full bg-[rgba(92,118,153,0.24)]" />
      <div className="absolute bottom-8 right-8 h-14 w-20 rounded-[18px] bg-white/35 backdrop-blur-[2px]" />
    </div>
  );
}

function StyleSampleCover({ colors }: { colors: [string, string, string] }) {
  return (
    <div className="absolute inset-0 overflow-hidden rounded-[22px]" style={{ background: `linear-gradient(150deg, ${colors[0]}, #ffffff 70%)` }}>
      <div className="absolute left-4 top-5 h-24 w-20 rotate-[-8deg] rounded-[22px]" style={{ backgroundColor: colors[2] }} />
      <div className="absolute left-20 top-10 h-20 w-24 rotate-[7deg] rounded-[24px] bg-[rgba(255,255,255,0.72)] backdrop-blur-[3px]" />
      <div className="absolute right-6 top-8 h-28 w-24 rotate-[10deg] rounded-[26px]" style={{ backgroundColor: colors[1] }} />
      <div className="absolute bottom-7 left-12 h-14 w-28 rounded-[18px] border border-[rgba(92,118,153,0.14)] bg-white/62" />
    </div>
  );
}

function PerspectiveCover({ colors }: { colors: [string, string, string] }) {
  return (
    <div className="absolute inset-0 overflow-hidden rounded-[22px]" style={{ background: `linear-gradient(180deg, ${colors[0]}, ${colors[1]})` }}>
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(92,118,153,0.1)_1px,transparent_1px),linear-gradient(180deg,rgba(92,118,153,0.1)_1px,transparent_1px)] bg-[size:26px_26px]" />
      <div className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ backgroundColor: colors[2] }} />
      {["-44%", "-18%", "18%", "44%"].map((offset) => (
        <div
          key={offset}
          className="absolute left-1/2 top-1/2 h-px origin-left bg-[rgba(92,118,153,0.42)]"
          style={{ width: "180px", transform: `translate(-50%, -50%) rotate(${offset})` }}
        />
      ))}
    </div>
  );
}

function GeneratedCover({ asset }: AssetCoverProps) {
  const variantSeed = hashValue(`${asset.title}:${asset.coverVariant ?? asset.type}:${asset.tags.join("|")}`);
  const colors = paletteFor(asset.type, variantSeed);

  return (
    <div className="absolute inset-0">
      {asset.type === "构图模板" ? <CompositionTemplate colors={colors} /> : null}
      {asset.type === "色彩方案" ? <ColorPaletteCover colors={colors} /> : null}
      {asset.type === "光影参考" ? <LightReferenceCover colors={colors} /> : null}
      {asset.type === "笔触纹理" ? <BrushTextureCover colors={colors} /> : null}
      {asset.type === "风格样本" ? <StyleSampleCover colors={colors} /> : null}
      {asset.type === "透视空间" ? <PerspectiveCover colors={colors} /> : null}
    </div>
  );
}

export function AssetCover({ asset, className }: AssetCoverProps) {
  return (
    <div className={cn("relative overflow-hidden rounded-[22px] border border-[hsl(var(--border)/0.62)] bg-[hsl(var(--card))]", className)}>
      {asset.coverImage ? (
        <Image
          src={asset.coverImage}
          alt={asset.title}
          fill
          sizes="(max-width: 1280px) 100vw, 400px"
          className="object-cover"
        />
      ) : (
        <GeneratedCover asset={asset} />
      )}

      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(22,32,48,0.08))]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-[linear-gradient(180deg,transparent,rgba(18,27,40,0.18))]" />
      <div className="pointer-events-none absolute bottom-3 left-3 rounded-full border border-white/38 bg-white/28 px-2.5 py-1 text-[10px] font-medium text-[rgba(31,45,66,0.88)] backdrop-blur-[8px]">
        {asset.type}
      </div>
    </div>
  );
}
