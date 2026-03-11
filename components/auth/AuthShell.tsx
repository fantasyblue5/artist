import type { ReactNode } from "react";

type AuthShellProps = {
  preview: ReactNode;
  card: ReactNode;
};

export function AuthShell({ preview, card }: AuthShellProps) {
  return (
    <div className="relative min-h-screen overflow-hidden p-4 md:p-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_14%_14%,rgba(88,129,176,0.22),transparent_34%),radial-gradient(circle_at_88%_88%,rgba(165,190,224,0.2),transparent_42%),linear-gradient(180deg,rgba(231,238,247,0.65),rgba(242,246,252,0.92))]" />
      <div className="auth-grid-pattern pointer-events-none absolute inset-0 opacity-45" />
      <div className="auth-noise-pattern pointer-events-none absolute inset-0 opacity-25" />

      <div className="relative mx-auto grid min-h-[calc(100vh-2rem)] max-w-[1320px] overflow-hidden rounded-[34px] border border-[hsl(var(--border)/0.8)] bg-[hsl(var(--card)/0.42)] shadow-[0_26px_54px_rgba(35,58,86,0.16)] backdrop-blur-2xl lg:grid-cols-[minmax(0,1.18fr)_minmax(0,0.82fr)]">
        <section className="flex items-center p-6 sm:p-8 lg:p-10">
          {preview}
        </section>

        <section className="flex items-center justify-center border-t border-[hsl(var(--border)/0.8)] p-6 sm:p-8 lg:border-l lg:border-t-0 lg:p-10">
          {card}
        </section>
      </div>
    </div>
  );
}
