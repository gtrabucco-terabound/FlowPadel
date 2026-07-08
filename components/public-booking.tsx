"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createPublicBooking } from "@/app/reservar/[slug]/actions";

export interface PublicCourt {
  id: string;
  name: string;
  number: number | null;
  open_hour: number;
  close_hour: number;
  slot_minutes: number;
  price_per_slot: number | null;
  operating_days: number[] | null;
}
export interface PublicBookingRow {
  court_id: string;
  start_minutes: number;
  slot_minutes: number;
}

const hhmm = (m: number) =>
  `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

function dowOf(dateISO: string): number {
  const js = new Date(dateISO + "T12:00:00").getDay();
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
function slotsFor(c: PublicCourt): number[] {
  const out: number[] = [];
  const step = c.slot_minutes || 90;
  for (let m = c.open_hour * 60; m + step <= c.close_hour * 60; m += step) out.push(m);
  return out;
}

export function PublicBooking({
  slug,
  date,
  courts,
  bookings,
  me = null,
}: {
  slug: string;
  date: string;
  courts: PublicCourt[];
  bookings: PublicBookingRow[];
  me?: { name: string; phone: string } | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  // Turno elegido: `${courtId}:${min}`
  const [picked, setPicked] = useState<{ courtId: string; min: number } | null>(null);
  const [name, setName] = useState(me?.name ?? "");
  const [phone, setPhone] = useState(me?.phone ?? "");
  const loggedIn = !!me?.name;

  const dow = dowOf(date);
  const takenAt = (courtId: string, min: number, slot: number) =>
    bookings.some(
      (b) =>
        b.court_id === courtId &&
        min < b.start_minutes + b.slot_minutes &&
        min + slot > b.start_minutes
    );

  const go = (d: string) => router.push(`/reservar/${slug}?date=${d}`);

  const submit = () => {
    if (!picked) return;
    setError(null);
    start(async () => {
      const r = await createPublicBooking({
        slug,
        courtId: picked.courtId,
        date,
        startMinutes: picked.min,
        name,
        phone,
      });
      if (!r.ok) setError(r.error);
      else window.location.href = r.checkoutUrl;
    });
  };

  const openCourts = courts.filter((c) => (c.operating_days ?? [1, 2, 3, 4, 5, 6, 7]).includes(dow));

  return (
    <div className="mt-5 space-y-4">
      {/* Navegación de fecha */}
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => go(addDays(date, -1))}>
          ← Anterior
        </Button>
        <input
          type="date"
          value={date}
          onChange={(e) => go(e.target.value)}
          className="rounded-lg border border-border-strong bg-surface px-3 py-1.5 text-sm text-ink"
        />
        <Button variant="outline" size="sm" onClick={() => go(addDays(date, 1))}>
          Siguiente →
        </Button>
        <span className="text-sm font-medium capitalize text-muted">{prettyDate(date)}</span>
      </div>

      {error && <p className="text-sm font-semibold text-red-500">{error}</p>}

      {openCourts.length === 0 ? (
        <div className="rounded-xl border border-border-soft bg-surface px-4 py-10 text-center text-sm text-muted">
          No hay canchas disponibles este día.
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(240px,1fr))]">
          {openCourts.map((court) => {
            const slots = slotsFor(court);
            return (
              <div key={court.id} className="rounded-2xl border border-border-soft bg-canvas p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-semibold text-ink">
                    {court.number ? `#${court.number} · ` : ""}{court.name}
                  </h3>
                  {court.price_per_slot != null && (
                    <span className="text-xs text-muted">${court.price_per_slot}</span>
                  )}
                </div>
                <div className="space-y-1.5">
                  {slots.map((min) => {
                    const taken = takenAt(court.id, min, court.slot_minutes);
                    const isPicked = picked?.courtId === court.id && picked?.min === min;
                    if (taken) {
                      return (
                        <div
                          key={min}
                          className="flex items-center justify-between rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300/80"
                        >
                          <span className="font-mono text-xs">{hhmm(min)}</span>
                          <span className="text-xs font-semibold">Reservada</span>
                        </div>
                      );
                    }
                    return (
                      <button
                        key={min}
                        type="button"
                        onClick={() =>
                          setPicked(isPicked ? null : { courtId: court.id, min })
                        }
                        className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-sm transition-colors ${
                          isPicked
                            ? "border-accent bg-accent/10 text-ink"
                            : "border-dashed border-border-soft text-muted hover:border-accent hover:text-ink"
                        }`}
                      >
                        <span className="font-mono text-xs">{hhmm(min)}</span>
                        <span className="text-xs">{isPicked ? "Elegido ✓" : "Libre"}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Barra de reserva del turno elegido */}
      {picked && (
        <div className="sticky bottom-4 rounded-2xl border border-accent/50 bg-canvas p-4 shadow-xl">
          <p className="text-sm font-semibold text-ink">
            Reservar{" "}
            {(() => {
              const c = courts.find((x) => x.id === picked.courtId);
              return `${c?.number ? `#${c.number} ` : ""}${c?.name ?? ""} · ${hhmm(picked.min)}`;
            })()}
          </p>
          {loggedIn ? (
            <p className="mt-2 text-sm text-muted">
              Reservás como <span className="font-semibold text-ink">{me?.name}</span>.
            </p>
          ) : (
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <input
                placeholder="Tu nombre"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-ink"
              />
              <input
                placeholder="Tu teléfono (WhatsApp)"
                inputMode="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-ink"
              />
            </div>
          )}
          <div className="mt-3 flex items-center gap-2">
            <Button onClick={submit} disabled={pending || name.trim().length < 2}>
              {pending ? "Redirigiendo…" : "Reservar y pagar"}
            </Button>
            <Button variant="ghost" onClick={() => setPicked(null)} disabled={pending}>
              Cancelar
            </Button>
          </div>
          <p className="mt-2 text-xs text-muted">
            El turno queda reservado 30 min mientras pagás. Si no completás el pago,
            se libera automáticamente.
          </p>
        </div>
      )}
    </div>
  );
}
