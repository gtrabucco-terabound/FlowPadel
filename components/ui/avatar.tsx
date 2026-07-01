import { cn, initials } from "@/lib/utils";

export function Avatar({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-padel-50 text-sm font-semibold text-padel-700",
        className
      )}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}
