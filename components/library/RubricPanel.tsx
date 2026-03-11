"use client";

import { ClipboardCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function RubricPanel() {
  return (
    <Card className="h-full rounded-3xl border-[hsl(var(--border)/0.8)] bg-[hsl(var(--card)/0.84)]">
      <CardContent className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
        <ClipboardCheck className="h-10 w-10 text-[hsl(var(--muted-foreground))]" />
        <h3 className="text-xl font-semibold tracking-tight">评审规范模块准备中</h3>
        <p className="max-w-lg text-sm leading-6 text-[hsl(var(--muted-foreground))]">
          后续将接入作品评审 Rubric、批注规范与自动评审建议。
        </p>
      </CardContent>
    </Card>
  );
}
