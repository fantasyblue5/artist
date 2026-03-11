import { AuthHeroIllustration } from "@/components/auth/AuthHeroIllustration";

export function AuthPreview() {
  return (
    <div className="relative w-full max-w-[740px]">
      <div className="pointer-events-none absolute -left-10 -right-8 -top-14 bottom-[-32px]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_14%,rgba(80,110,149,0.12),transparent_38%),radial-gradient(circle_at_86%_42%,rgba(90,121,160,0.1),transparent_42%),radial-gradient(circle_at_18%_90%,rgba(180,83,114,0.08),transparent_34%)]" />
        <div className="absolute inset-0 opacity-[0.04] bg-[repeating-radial-gradient(circle_at_0_0,rgba(66,95,132,0.72)_0,rgba(66,95,132,0.72)_0.45px,transparent_0.95px,transparent_3.4px)]" />
      </div>

      <div className="relative">
        <h1 className="text-3xl font-semibold tracking-tight text-[hsl(var(--foreground))] sm:text-4xl">
          艺术家 Workspace
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-[hsl(var(--muted-foreground))] sm:text-base">
          AI 创作与图谱驱动工作台
        </p>
      </div>

      <div className="relative mt-9 h-[368px] overflow-hidden rounded-[32px] border border-[hsl(var(--border)/0.7)] bg-[hsl(var(--card)/0.58)] p-4 shadow-[0_18px_32px_rgba(46,71,101,0.12)] backdrop-blur-xl">
        <AuthHeroIllustration />
      </div>
    </div>
  );
}
