"use client";

import { useRouter } from "next/navigation";

type View = "dia" | "semana" | "mes";

const pad = (n: number) => String(n).padStart(2, "0");
const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
function shift(dateISO: string, view: View, dir: number): string {
  const d = new Date(dateISO + "T12:00:00");
  if (view === "dia") d.setDate(d.getDate() + dir);
  else if (view === "semana") d.setDate(d.getDate() + 7 * dir);
  else d.setMonth(d.getMonth() + dir);
  return iso(d);
}

export function CalendarNav({ view, date }: { view: View; date: string }) {
  const router = useRouter();
  const go = (v: View, d: string) => router.push(`/admin/calendario?view=${v}&date=${d}`);
  const tab = (v: View, label: string) => (
    <button
      type="button"
      onClick={() => go(v, date)}
      className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
        view === v ? "bg-accent text-accent-ink" : "text-muted hover:bg-surface-2"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="inline-flex gap-1 rounded-xl border border-border-soft bg-surface p-1">
        {tab("dia", "Día")}
        {tab("semana", "Semana")}
        {tab("mes", "Mes")}
      </div>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => go(view, shift(date, view, -1))}
          className="rounded-lg border border-border-strong bg-surface px-2.5 py-1.5 text-sm text-ink">←</button>
        <input
          type="date"
          value={date}
          onChange={(e) => go(view, e.target.value)}
          className="rounded-lg border border-border-strong bg-surface px-3 py-1.5 text-sm text-ink"
        />
        <button type="button" onClick={() => go(view, shift(date, view, 1))}
          className="rounded-lg border border-border-strong bg-surface px-2.5 py-1.5 text-sm text-ink">→</button>
      </div>
    </div>
  );
}
