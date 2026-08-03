"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  createBooking,
  cancelBooking,
  createBookingWithPayment,
  generateBookingPaymentLink,
} from "@/app/admin/agenda/actions";
import { courtSlots, type CourtBand } from "@/modules/reservations/slots";

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
  bands?: CourtBand[] | null;
}
export interface AgendaBooking {
  id: string;
  court_id: string;
  booking_date: string;
  start_minutes: number;
  slot_minutes: number;
  status: string;
  kind: string;
  customer_name: string | null;
  customer_phone: string | null;
  checkout_url: string | null;
  amount_charged: number | null;
  paid_at: string | null;
}

/** Normaliza un teléfono AR a formato wa.me (54 + área + número). */
function waNumber(phone: string | null): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 8) return null;
  return digits.startsWith("54") ? digits : `54${digits}`;
}
type View = "dia" | "semana" | "mes";

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

function slotsFor(court: AgendaCourt) {
  return courtSlots(court);
}

const pad2 = (n: number) => String(n).padStart(2, "0");
const isoOf = (d: Date) =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

/** Enumera los días a mostrar en la vista semana (7) o mes (grilla de 6 semanas). */
function overviewDays(view: View, dateISO: string): string[] {
  const d = new Date(dateISO + "T12:00:00");
  if (view === "semana") {
    const js = d.getDay();
    const off = js === 0 ? -6 : 1 - js;
    const mon = new Date(d);
    mon.setDate(d.getDate() + off);
    return Array.from({ length: 7 }, (_, i) => {
      const x = new Date(mon);
      x.setDate(mon.getDate() + i);
      return isoOf(x);
    });
  }
  const first = new Date(d.getFullYear(), d.getMonth(), 1);
  const js = first.getDay();
  const off = js === 0 ? -6 : 1 - js;
  const gridStart = new Date(first);
  gridStart.setDate(first.getDate() + off);
  return Array.from({ length: 42 }, (_, i) => {
    const x = new Date(gridStart);
    x.setDate(gridStart.getDate() + i);
    return isoOf(x);
  });
}

/** Ocupación de un día: total de turnos, tomados y libres. */
function occupancyOf(
  dayISO: string,
  courts: AgendaCourt[],
  bookings: AgendaBooking[]
): { total: number; taken: number; free: number } {
  const dow = dowOf(dayISO);
  let total = 0;
  const slotsByCourt = new Map<string, ReturnType<typeof slotsFor>>();
  for (const c of courts) {
    const slots = (c.operating_days ?? []).includes(dow) ? slotsFor(c) : [];
    slotsByCourt.set(c.id, slots);
    total += slots.length;
  }
  // Cada reserva ocupa los turnos de la grilla que solapa (respeta las franjas).
  const taken = bookings
    .filter((b) => b.booking_date === dayISO)
    .reduce((s, b) => {
      const end = b.start_minutes + (b.slot_minutes || 90);
      const covered = (slotsByCourt.get(b.court_id) ?? []).filter(
        (sl) => sl.start_minutes < end && b.start_minutes < sl.start_minutes + sl.slot_minutes
      ).length;
      return s + covered;
    }, 0);
  return { total, taken, free: Math.max(0, total - taken) };
}

const DOW_LABELS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

/** Vista completa de la agenda con selector Día / Semana / Mes. */
export function AgendaView({
  date,
  view,
  courts,
  bookings,
}: {
  date: string;
  view: View;
  courts: AgendaCourt[];
  bookings: AgendaBooking[];
}) {
  const router = useRouter();
  const go = (v: View) => router.push(`/admin/agenda?view=${v}&date=${date}`);
  const tabCls = (v: View) =>
    `rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
      view === v ? "bg-accent text-accent-ink" : "text-muted hover:bg-surface-2"
    }`;

  return (
    <div className="space-y-4">
      <div className="inline-flex gap-1 rounded-xl border border-border-soft bg-surface p-1">
        <button type="button" className={tabCls("dia")} onClick={() => go("dia")}>
          Día
        </button>
        <button type="button" className={tabCls("semana")} onClick={() => go("semana")}>
          Semana
        </button>
        <button type="button" className={tabCls("mes")} onClick={() => go("mes")}>
          Mes
        </button>
      </div>

      {view === "dia" ? (
        <AgendaGrid
          date={date}
          courts={courts}
          bookings={bookings.filter((b) => b.booking_date === date)}
        />
      ) : (
        <Overview date={date} view={view} courts={courts} bookings={bookings} />
      )}
    </div>
  );
}

function Overview({
  date,
  view,
  courts,
  bookings,
}: {
  date: string;
  view: View;
  courts: AgendaCourt[];
  bookings: AgendaBooking[];
}) {
  const router = useRouter();
  const days = overviewDays(view, date);
  const month = new Date(date + "T12:00:00").getMonth();

  const barColor = (ratio: number) =>
    ratio >= 0.85
      ? "bg-red-500"
      : ratio >= 0.5
        ? "bg-amber-500"
        : "bg-accent";

  const goDay = (d: string) => router.push(`/admin/agenda?view=dia&date=${d}`);

  if (view === "semana") {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {days.map((d) => {
          const { total, taken, free } = occupancyOf(d, courts, bookings);
          const ratio = total > 0 ? taken / total : 0;
          const dd = new Date(d + "T12:00:00");
          return (
            <button
              key={d}
              type="button"
              onClick={() => goDay(d)}
              className="rounded-xl border border-border-soft bg-surface p-3 text-left transition-colors hover:border-accent"
            >
              <p className="text-xs font-semibold uppercase text-muted">
                {DOW_LABELS[dowOf(d) - 1]} {dd.getDate()}
              </p>
              <p className="mt-1 text-lg font-bold text-ink">{free} libres</p>
              <p className="text-xs text-muted">
                {taken}/{total} tomados
              </p>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-border-soft">
                <div
                  className={`h-full ${barColor(ratio)}`}
                  style={{ width: `${Math.round(ratio * 100)}%` }}
                />
              </div>
            </button>
          );
        })}
      </div>
    );
  }

  // Mes: grilla de 6 semanas (Lun–Dom)
  return (
    <div>
      <div className="mb-2 grid grid-cols-7 gap-1.5 text-center text-xs font-semibold text-muted">
        {DOW_LABELS.map((l) => (
          <div key={l}>{l}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {days.map((d) => {
          const dd = new Date(d + "T12:00:00");
          const inMonth = dd.getMonth() === month;
          const { total, taken, free } = occupancyOf(d, courts, bookings);
          const ratio = total > 0 ? taken / total : 0;
          return (
            <button
              key={d}
              type="button"
              onClick={() => goDay(d)}
              className={`min-h-[64px] rounded-lg border p-1.5 text-left transition-colors hover:border-accent ${
                inMonth
                  ? "border-border-soft bg-surface"
                  : "border-transparent bg-transparent opacity-40"
              }`}
            >
              <p className="text-xs font-semibold text-ink">{dd.getDate()}</p>
              {inMonth && total > 0 && (
                <>
                  <p className="mt-0.5 text-[11px] text-muted">{free} libres</p>
                  <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-border-soft">
                    <div
                      className={`h-full ${barColor(ratio)}`}
                      style={{ width: `${Math.round(ratio * 100)}%` }}
                    />
                  </div>
                </>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
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
  // Link de pago recién generado (para copiar / mandar por WhatsApp).
  const [payLink, setPayLink] = useState<
    { url: string; name: string; phone: string | null } | null
  >(null);
  const [copied, setCopied] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const generatePayLink = (form: HTMLFormElement) => {
    setError(null);
    const fd = new FormData(form);
    const name = String(fd.get("customer_name") ?? "").trim();
    const phone = String(fd.get("customer_phone") ?? "").trim() || null;
    start(async () => {
      const r = await createBookingWithPayment(fd);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setEditing(null);
      setCopied(false);
      setPayLink({ url: r.checkoutUrl, name, phone });
      router.refresh();
    });
  };

  const waHref = (url: string, name: string, phone: string | null) => {
    const text = encodeURIComponent(
      `Hola ${name}, reservá tu turno pagando acá: ${url}`
    );
    const num = waNumber(phone);
    return num ? `https://wa.me/${num}?text=${text}` : `https://wa.me/?text=${text}`;
  };

  const dow = dowOf(date);
  // Reserva que ARRANCA exactamente en este turno (muestra la tarjeta completa).
  const bookingAt = (courtId: string, min: number) =>
    bookings.find((b) => b.court_id === courtId && b.start_minutes === min) ?? null;
  // Reserva que CUBRE este turno pero arrancó en uno anterior (turnos seguidos:
  // grupos con varios turnos, clases largas). Evita reservar encima del bloqueo.
  const coveringBooking = (courtId: string, min: number) =>
    bookings.find(
      (b) =>
        b.court_id === courtId &&
        b.start_minutes < min &&
        min < b.start_minutes + (b.slot_minutes || 90)
    ) ?? null;

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

      {payLink && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-amber-900">
                Link de pago listo para {payLink.name}
              </p>
              <p className="mt-0.5 text-xs text-amber-800">
                El turno queda reservado 30 min. Se confirma solo al pagar; si no
                paga, se libera automáticamente.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setPayLink(null)}
              className="text-xs font-semibold text-amber-800"
            >
              Cerrar
            </button>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <input
              readOnly
              value={payLink.url}
              onFocus={(e) => e.currentTarget.select()}
              className="min-w-0 flex-1 rounded-md border border-amber-300 bg-surface px-2 py-1.5 text-xs text-ink"
            />
            <Button
              type="button"
              size="sm"
              onClick={() => {
                navigator.clipboard?.writeText(payLink.url);
                setCopied(true);
              }}
            >
              {copied ? "¡Copiado!" : "Copiar"}
            </Button>
            <a
              href={waHref(payLink.url, payLink.name, payLink.phone)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center rounded-lg bg-[#25D366] px-3 py-1.5 text-sm font-semibold text-white"
            >
              WhatsApp{payLink.phone ? " →" : ""}
            </a>
          </div>
        </div>
      )}

      <div className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(260px,1fr))]">
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
                  {slots.map((slot) => {
                    const min = slot.start_minutes;
                    const b = bookingAt(court.id, min);
                    const key = `${court.id}:${min}`;
                    // Turno cubierto por una reserva de varios turnos seguidos.
                    if (!b) {
                      const cover = coveringBooking(court.id, min);
                      if (cover) {
                        return (
                          <div
                            key={min}
                            className="rounded-lg border border-accent/40 bg-surface px-3 py-2 text-sm text-muted"
                          >
                            <span className="font-mono text-xs text-muted">{hhmm(min)}</span>{" "}
                            <span className="text-xs">
                              · continúa{cover.kind === "class" ? " (entrenamiento)" : ""}
                            </span>
                          </div>
                        );
                      }
                    }
                    if (b) {
                      return (
                        <div
                          key={min}
                          className={`rounded-lg border px-3 py-2 text-sm ${
                            b.status === "blocked"
                              ? "border-border-soft bg-surface text-muted"
                              : b.status === "held"
                                ? "border-amber-400/50 bg-amber-400/10"
                                : "border-accent/40 bg-surface"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span>
                              <span className="font-mono text-xs text-muted">
                                {hhmm(min)}
                              </span>{" "}
                              <span className="font-medium text-ink">
                                {b.status === "blocked"
                                  ? "Bloqueado"
                                  : b.customer_name || "Reservado"}
                              </span>
                              {b.status === "held" && (
                                <span className="ml-1 text-xs font-semibold text-amber-300">
                                  · Esperando pago
                                </span>
                              )}
                              {b.kind === "fixed" && (
                                <span className="ml-1 rounded bg-accent/15 px-1 text-[10px] font-semibold uppercase text-ink">
                                  fijo
                                </span>
                              )}
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
                          {b.paid_at ? (
                            <p className="mt-1 text-[11px] font-semibold text-emerald-400">
                              ✓ Pagado
                              {b.amount_charged != null ? ` ($${b.amount_charged})` : ""}
                            </p>
                          ) : b.checkout_url ? (
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              {b.amount_charged != null && (
                                <span className="rounded bg-amber-400/15 px-1.5 py-0.5 text-[11px] font-semibold text-amber-300">
                                  Cobra ${b.amount_charged}
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard?.writeText(b.checkout_url!);
                                  setCopiedId(b.id);
                                }}
                                className="rounded-md bg-amber-400 px-2 py-1 text-[11px] font-semibold text-[#1a1200] hover:bg-amber-300"
                              >
                                {copiedId === b.id ? "¡Copiado!" : "Copiar link"}
                              </button>
                              <a
                                href={waHref(
                                  b.checkout_url,
                                  b.customer_name || "",
                                  b.customer_phone
                                )}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="rounded-md bg-[#25D366] px-2 py-1 text-[11px] font-semibold text-white hover:brightness-95"
                              >
                                WhatsApp{waNumber(b.customer_phone) ? " →" : ""}
                              </a>
                            </div>
                          ) : (
                            b.status === "reserved" &&
                            b.kind !== "fixed" &&
                            slot.price != null &&
                            slot.price > 0 && (
                              <button
                                type="button"
                                disabled={pending}
                                onClick={() =>
                                  run(() => generateBookingPaymentLink(b.id))
                                }
                                className="mt-2 rounded-md border border-accent px-2 py-1 text-[11px] font-semibold text-ink"
                              >
                                Cobrar online
                              </button>
                            )
                          )}
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
                          <input type="hidden" name="slot_minutes" value={slot.slot_minutes} />
                          <input
                            type="hidden"
                            name="price"
                            value={slot.price ?? ""}
                          />
                          <p className="font-mono text-xs text-muted">
                            {hhmm(min)}–{hhmm(min + slot.slot_minutes)}
                            {slot.price != null ? ` · $${slot.price}` : ""}
                          </p>
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
                            {slot.price != null &&
                              slot.price > 0 && (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  disabled={pending}
                                  onClick={(e) =>
                                    generatePayLink(e.currentTarget.form!)
                                  }
                                >
                                  Cobrar online
                                </Button>
                              )}
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
                        <span className="font-mono text-xs">
                          {hhmm(min)}–{hhmm(min + slot.slot_minutes)}
                        </span>
                        <span className="text-xs">
                          Libre{slot.price != null ? ` · $${slot.price}` : ""} · reservar
                        </span>
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
