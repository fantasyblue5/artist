import { AuthCard } from "@/components/auth/AuthCard";
import { AuthPreview } from "@/components/auth/AuthPreview";
import { AuthShell } from "@/components/auth/AuthShell";

type LoginPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function resolveNextPath(nextValue: string | string[] | undefined): string {
  const raw = Array.isArray(nextValue) ? nextValue[0] : nextValue;
  if (!raw) {
    return "/workspace";
  }

  if (!raw.startsWith("/") || raw.startsWith("//")) {
    return "/workspace";
  }

  return raw;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const sp = (await searchParams) ?? {};
  const nextPath = resolveNextPath(sp.next);
  return <AuthShell preview={<AuthPreview />} card={<AuthCard nextPath={nextPath} />} />;
}
