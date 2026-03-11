import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TermsPage() {
  return (
    <main className="grid min-h-screen place-items-center px-4 py-8">
      <Card className="w-full max-w-2xl rounded-3xl border-[hsl(var(--border))] bg-[hsl(var(--card)/0.96)]">
        <CardHeader>
          <CardTitle className="text-base">服务条款（占位）</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-[hsl(var(--muted-foreground))]">
          <p>这里是服务条款占位内容，可在后续接入正式法律文案。</p>
          <Link href="/login">
            <Button variant="outline">返回登录</Button>
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
