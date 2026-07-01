import * as React from "react";
import { cn } from "@/lib/utils";

type Tone = "open" | "live" | "closed" | "neutral" | "draft";

const TONES: Record<Tone, string> = {
  // Abierto = positive
  open: "bg-positive/15 text-positive",
  // En vivo = danger (con punto, ver abajo)
  live: "bg-danger/15 text-danger",
  // Cerrado = muted
  closed: "bg-surface-2 text-muted",
  // Torneo / neutro = lima tenue
  neutral: "bg-padel-50 text-padel-700",
  // Cancha abierta / borrador = warn
  draft: "bg-warn/15 text-warn",
};

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
}

export function Badge({
  className,
  tone = "neutral",
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        TONES[tone],
        className
      )}
      {...props}
    >
      {tone === "live" && (
        <span className="relative flex h-1.5 w-1.5" aria-hidden>
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-danger opacity-75" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-danger" />
        </span>
      )}
      {children}
    </span>
  );
}
