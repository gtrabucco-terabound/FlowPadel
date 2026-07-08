"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createBooking, cancelBooking } from "@/app/admin/agenda/actions";

export interface AgendaCourt {
  id: string;
  name: string;
  number: number | null;
  is_active: boolean;
  open_hour: number;
  close_hour: number;
  slot_minutes: number;
  operating_days: number[];
  price_per_slot: number | null;
}
export interface AgendaBooking {
  id: string;
  court_id: string;
  start_minutes: number;
  slot_minutes: number;
  status: string;
  kind: string;
  customer_name: string | null;
}

const hhmm = (min: number) =>
  `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;

/** 1=Lun..7=Dom a partir de una fecha ISO (getDay: 0=Dom..6=Sáb). */
function dowOf(dateISO: string): number {
  const d = new Date(dateISO + "T12:00:00");
  const js = d.getDay();
  return js === 0 ? 7 : js;
}
function addDays(dateISO: string, n: number): string {
  const d = new Date(dateISO + "T12:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}
function prettyDate(dateISO: string): string {
  return new Date(dateISO + "T12:00:00").toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function slotsFor(court: AgendaCourt): number[] {
  const out: number[] = [];
  const start = court.open_hour * 60;
  const end = court.close_hour * 60;
  const step = court.slot_minutes || 90;
  for (let m = start; m + step <= end; m += step) out.push(m);
  return out;
}

export function AgendaGrid({
  date,
  courts,
  bookings,
}: {
  date: string;
  courts: AgendaCourt[];
  bookings: AgendaBooking[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  // Slot en edición: `${courtId}:${startMin}`
  const [editing, setEditing] = useState<string | null>(null);

  const dow = dowOf(date);
  const bookingAt = (courtId: string, min: number) =>
    bookings.find((b) => b.court_id === courtId && b.start_minutes === min) ?? null;

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) => {
    setError(null);
    start(async () => {
      const r = await fn();
      if (!r.ok) setError(r.error ?? "Error");
      else {
        setEditing(null);
        router.refresh();
      }
    });
  };

  return (
    <div className="space-y-4">
      {/* Navegación de fecha */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push(`/admin/agenda?date=${addDays(date, -1)}`)}
        >
          ← Anterior
        </Button>
        <input
          type="date"
          value={date}
          onChange={(e) => router.push(`/admin/agenda?date=${e.target.value}`)}
          className="rounded-lg border border-border-strong bg-surface px-3 py-1.5 text-sm text-ink"
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push(`/admin/agenda?date=${addDays(date, 1)}`)}
        >
          Siguiente →
        </Button>
        <span className="ml-2 text-sm font-medium capitalize text-muted">
          {prettyDate(date)}
        </span>
      </div>

      {error && <p className="text-sm font-semibold text-red-600">{error}</p>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {courts.map((court) => {
          const operates = (court.operating_days ?? []).includes(dow);
          const slots = slotsFor(court);
          return (
            <div key={court.id} className="rounded-2xl border border-border-soft bg-canvas p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-semibold text-ink">
                  {court.number ? `#${court.number} · ` : ""}
                  {court.name}
                </h3>
                {court.price_per_slot != null && (
                  <span className="text-xs text-muted">
                    ${court.price_per_slot}/turno
                  </span>
                )}
              </div>

              {!operates ? (
                <p className="py-4 text-center text-xs text-muted">
                  No opera este día.
                </p>
              ) : (
                <div className="space-y-1.5">
                  {slots.map((min) => {
                    const b = bookingAt(court.id, min);
                    const key = `${court.id}:${min}`;
                    if (b) {
                      return (
                        <div
                          key={min}
                          className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm ${
                            b.status === "blocked"
                              ? "border-border-soft bg-surface text-muted"
                              : "border-accent/40 bg-surface"
                          }`}
                        >
                          <span>
                            <span className="font-mono text-xs text-muted">
                              {hhmm(min)}
                            </span>{" "}
                            <span className="font-medium text-ink">
                              {b.status === "blocked"
                                ? "Bloqueado"
                                : b.customer_name || "Reservado"}
                            </span>
                          </span>
                          <button
                            type="button"
                            disabled={pending}
                            onClick={() => run(() => cancelBooking(b.id))}
                            className="text-xs font-semibold text-red-600"
                          >
                            Liberar
                          </button>
                        </div>
                      );
                    }
                    if (editing === key) {
                      return (
                        <form
                          key={min}
                          action={(fd) => run(() => createBooking(fd))}
                          className="space-y-2 rounded-lg border border-accent bg-surface p-2.5"
                        >
                          <input type="hidden" name="court_id" value={court.id} />
                          <input type="hidden" name="booking_date" value={date} />
                          <input type="hidden" name="start_minutes" value={min} />
                          <input type="hidden" name="slot_minutes" value={court.slot_minutes} />
                          <input
                            type="hidden"
                            name="price"
                            value={court.price_per_slot ?? ""}
                          />
                          <p className="font-mono text-xs text-muted">{hhmm(min)}</p>
                          <input
                            name="customer_name"
                            placeholder="Nombre de quien reserva"
                            className="w-full rounded-md border border-border-strong bg-canvas px-2 py-1.5 text-sm text-ink"
                            autoFocus
                          />
                          <input
                            name="customer_phone"
                            placeholder="Teléfono (opcional)"
                            inputMode="numeric"
                            className="w-full rounded-md border border-border-strong bg-canvas px-2 py-1.5 text-sm text-ink"
                          />
                          <div className="flex flex-wrap gap-1.5">
                            <Button type="submit" size="sm" name="status" value="reserved" disabled={pending}>
                              Reservar
                            </Button>
                            <Button type="submit" size="sm" variant="outline" name="status" value="blocked" disabled={pending}>
                              Bloquear
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => setEditing(null)}
                            >
                              Cancelar
                            </Button>
                          </div>
                        </form>
                      );
                    }
                    return (
                      <button
                        key={min}
                        type="button"
                        onClick={() => setEditing(key)}
                        className="flex w-full items-center justify-between rounded-lg border border-dashed border-border-soft px-3 py-2 text-sm text-muted transition-colors hover:border-accent hover:text-ink"
                      >
                        <span className="font-mono text-xs">{hhmm(min)}</span>
                        <span className="text-xs">Libre · reservar</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
