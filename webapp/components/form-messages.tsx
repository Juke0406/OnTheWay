"use client";

import { cn } from "@/lib/utils";
import { AlertCircle, CheckCircle2, Info } from "lucide-react";

interface FormMessagesProps {
  type: "error" | "success" | "info";
  messages: string[];
  className?: string;
}

export function FormMessages({
  type,
  messages,
  className,
}: FormMessagesProps) {
  if (!messages || messages.length === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        "flex items-start gap-2",
        {
          "text-destructive": type === "error",
          "text-success": type === "success",
          "text-info": type === "info",
        },
        className
      )}
    >
      {type === "error" && <AlertCircle className="size-4 mt-0.5" />}
      {type === "success" && <CheckCircle2 className="size-4 mt-0.5" />}
      {type === "info" && <Info className="size-4 mt-0.5" />}
      <div className="flex flex-col gap-1">
        {messages.map((message, i) => (
          <p key={i}>{message}</p>
        ))}
      </div>
    </div>
  );
}
