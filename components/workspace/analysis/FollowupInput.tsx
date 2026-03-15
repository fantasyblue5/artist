"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowUp } from "lucide-react";

type FollowupInputProps = {
  disabled?: boolean;
  loading?: boolean;
  onSubmit: (question: string) => void | Promise<void>;
};

export function FollowupInput({ disabled, loading, onSubmit }: FollowupInputProps) {
  const [question, setQuestion] = useState("");

  const handleSubmit = async () => {
    const nextQuestion = question.trim();
    if (!nextQuestion || disabled || loading) {
      return;
    }

    await onSubmit(nextQuestion);
    setQuestion("");
  };

  return (
    <div className="flex items-center gap-2 rounded-[22px] border border-[hsl(var(--border)/0.72)] bg-white/94 p-2 shadow-[0_10px_24px_rgba(52,74,100,0.08)]">
      <input
        value={question}
        onChange={(event) => setQuestion(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            void handleSubmit();
          }
        }}
        disabled={disabled || loading}
        placeholder=""
        className="h-12 min-w-0 flex-1 rounded-[18px] border border-[hsl(var(--border)/0.75)] bg-[hsl(var(--card))] px-4 text-sm text-[hsl(var(--foreground))] outline-none placeholder:text-[hsl(var(--muted-foreground))] focus:border-[hsl(var(--primary)/0.42)]"
      />
      <Button
        size="sm"
        className="h-12 rounded-[18px] px-4"
        onClick={() => void handleSubmit()}
        disabled={disabled || loading}
      >
        <ArrowUp className="h-4 w-4" />
      </Button>
    </div>
  );
}
