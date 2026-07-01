import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-2", className)}>
      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent text-accent-ink">
        <svg
          viewBox="0 0 24 24"
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M6 4h12v3a6 6 0 0 1-12 0V4z" />
          <path d="M6 5H4a2 2 0 0 0 0 4h2M18 5h2a2 2 0 0 1 0 4h-2" />
          <path d="M12 13v4M9 20h6M10 17h4" />
        </svg>
      </span>
      <span className="text-lg font-semibold tracking-tight text-ink">
        Flow<span className="text-padel-600">Padel</span>
      </span>
    </span>
  );
}
