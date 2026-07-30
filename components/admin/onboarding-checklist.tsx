import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";

export type OnboardingStep = {
  label: string;
  description: string;
  href: string;
  done: boolean;
};

/**
 * Checklist de alta del club. Se muestra en el panel mientras falte algún paso;
 * cuando el club está operativo, desaparece solo.
 */
export function OnboardingChecklist({ steps }: { steps: OnboardingStep[] }) {
  const doneCount = steps.filter((s) => s.done).length;
  if (doneCount === steps.length) return null;

  const pct = Math.round((doneCount / steps.length) * 100);

  return (
    <Card>
      <CardContent className="space-y-4 py-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-ink">Puesta en marcha</h2>
            <p className="text-sm text-muted">
              Completá estos pasos para dejar tu club listo para recibir reservas
              y torneos.
            </p>
          </div>
          <span className="shrink-0 text-sm font-semibold text-padel-600">
            {doneCount}/{steps.length}
          </span>
        </div>

        <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
          <div
            className="h-full rounded-full bg-accent transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>

        <ol className="space-y-2">
          {steps.map((step) => (
            <li key={step.label}>
              <Link
                href={step.href}
                className={`flex items-start gap-3 rounded-xl border px-4 py-3 transition-colors ${
                  step.done
                    ? "border-border-soft bg-canvas"
                    : "border-border-strong bg-surface hover:border-accent"
                }`}
              >
                <span
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    step.done
                      ? "bg-accent text-accent-ink"
                      : "border border-border-strong text-faint"
                  }`}
                >
                  {step.done ? "✓" : ""}
                </span>
                <div className="min-w-0">
                  <p
                    className={`text-sm font-semibold ${
                      step.done ? "text-muted line-through" : "text-ink"
                    }`}
                  >
                    {step.label}
                  </p>
                  {!step.done && (
                    <p className="text-xs text-muted">{step.description}</p>
                  )}
                </div>
                {!step.done && (
                  <span className="ml-auto self-center text-sm font-semibold text-padel-600">
                    →
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
