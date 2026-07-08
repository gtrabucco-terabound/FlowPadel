"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  createFixedBooking,
  generateFixedCharge,
  deactivateFixedBooking,
} from "@/app/admin/turnos-fijos/actions";

export interface FixedCourt {
  id: string;
  name: string;
  number: number | null;
  open_hour: number;
  close_hour: number;
  slot_minutes: number;
  price_per_slot: number | null;
}
export interface FixedBookingRow {
  id: string;
  court_id: string;
  weekday: number;
  start_minutes: number;
  slot_minutes: number;
  customer_name: string;
  customer_phone: string | null;
  monthly_price: number;
  active: boolean;
  created_at: string;
}
export interface FixedChargeRow {
  id: string;
  fixed_booking_id: string;
  period: string;
  amount: number;
  status: string;
  due_date: string | null;
  checkout_url: string | null;
}

const DOW = ["", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const inputCls =
  "w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-ink";
const hhmm = (m: number) =>
  `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

function slotsFor(c: FixedCourt): number[] {
  const out: number[] = [];
  const step = c.slot_minutes || 90;
  for (let m = c.open_hour * 60; m + step <= c.close_hour * 60; m += step) out.push(m);
  return out;
}
function waNumber(phone: string | null): string | null {
  if (!phone) return null;
  const d = phone.replace(/\D/g, "");
  if (d.length < 8) return null;
  return d.startsWith("54") ? d : `54${d}`;
}

export function FixedBookingsManager({
  courts,
  fixedBookings,
  charges,
  period,
}: {
  courts: FixedCourt[];
  fixedBookings: FixedBookingRow[];
  charges: FixedChargeRow[];
  period: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [courtId, setCourtId] = useState(courts[0]?.id ?? "");
  const [newLink, setNewLink] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const court = courts.find((c) => c.id === courtId) ?? courts[0];
  const chargeByFb = new Map(charges.map((c) => [c.fixed_booking_id, c]));
  const courtName = (id: string) => {
    const c = courts.find((x) => x.id === id);
    return c ? `${c.number ? `#${c.number} ` : ""}${c.name}` : "Cancha";
  };

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) => {
    setError(null);
    start(async () => {
      const r = await fn();
      if (!r.ok) setError(r.error ?? "Error");
      else router.refresh();
    });
  };

  const waHref = (url: string, name: string, phone: string | null) => {
    const text = encodeURIComponent(
      `Hola ${name}, este es el link para pagar tu turno fijo de este mes: ${url}`
    );
    const num = waNumber(phone);
    return num ? `https://wa.me/${num}?text=${text}` : `https://wa.me/?text=${text}`;
  };

  if (courts.length === 0) {
    return (
      <div className="rounded-xl border border-border-soft bg-surface px-4 py-10 text-center text-sm text-muted">
        No hay canchas activas. Cargalas en Ajustes → Canchas para poder crear
        turnos fijos.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Alta de turno fijo */}
      <Card>
        <CardContent className="space-y-3 py-5">
          <h2 className="text-lg font-bold text-ink">Nuevo turno fijo</h2>
          <form
            action={(fd) =>
              start(async () => {
                setError(null);
                const r = await createFixedBooking(fd);
                if (!r.ok) {
                  setError(r.error);
                  return;
                }
                if (r.checkoutUrl) setNewLink(r.checkoutUrl);
                router.refresh();
              })
            }
            className="grid grid-cols-1 gap-3 sm:grid-cols-2"
          >
            <label className="space-y-1">
              <span className="text-xs font-medium text-ink">Cancha</span>
              <select
                name="court_id"
                value={courtId}
                onChange={(e) => setCourtId(e.target.value)}
                className={inputCls}
              >
                {courts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {courtName(c.id)}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-xs font-medium text-ink">Día de la semana</span>
              <select name="weekday" className={inputCls} defaultValue="1">
                {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                  <option key={d} value={d}>
                    {DOW[d]}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-xs font-medium text-ink">Horario</span>
              <select name="start_minutes" className={inputCls}>
                {slotsFor(court).map((m) => (
                  <option key={m} value={m}>
                    {hhmm(m)}
                  </option>
                ))}
              </select>
              <input type="hidden" name="slot_minutes" value={court.slot_minutes} />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-medium text-ink">Precio mensual ($)</span>
              <input
                name="monthly_price"
                type="number"
                min={1}
                placeholder="Ej: 200000"
                className={inputCls}
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-medium text-ink">Cliente</span>
              <input name="customer_name" placeholder="Nombre y apellido" className={inputCls} />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-medium text-ink">Teléfono (WhatsApp)</span>
              <input
                name="customer_phone"
                inputMode="numeric"
                placeholder="Ej: 1122334455"
                className={inputCls}
              />
            </label>
            <label className="space-y-1 sm:col-span-2">
              <span className="text-xs font-medium text-ink">Email (opcional)</span>
              <input name="customer_email" type="email" className={inputCls} />
            </label>
            {error && (
              <p className="text-sm font-semibold text-red-600 sm:col-span-2">{error}</p>
            )}
            <div className="sm:col-span-2">
              <Button type="submit" disabled={pending}>
                {pending ? "Creando…" : "Crear turno fijo y generar cobro"}
              </Button>
            </div>
          </form>

          {newLink && (
            <div className="rounded-xl border border-amber-300 bg-amber-50 p-3">
              <p className="text-sm font-semibold text-amber-900">
                Link de pago del mes generado
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <input
                  readOnly
                  value={newLink}
                  onFocus={(e) => e.currentTarget.select()}
                  className="min-w-0 flex-1 rounded-md border border-amber-300 bg-surface px-2 py-1.5 text-xs text-ink"
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard?.writeText(newLink);
                    setCopiedId("new");
                  }}
                >
                  {copiedId === "new" ? "¡Copiado!" : "Copiar"}
                </Button>
                <button
                  type="button"
                  onClick={() => setNewLink(null)}
                  className="text-xs font-semibold text-amber-800"
                >
                  Cerrar
                </button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Listado */}
      <div className="space-y-3">
        <h2 className="text-lg font-bold text-ink">
          Turnos fijos activos ({fixedBookings.length}) · cobro {period}
        </h2>
        {fixedBookings.length === 0 ? (
          <p className="text-sm text-muted">Todavía no cargaste turnos fijos.</p>
        ) : (
          fixedBookings.map((fb) => {
            const charge = chargeByFb.get(fb.id);
            const paid = charge?.status === "paid";
            return (
              <Card key={fb.id}>
                <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
                  <div>
                    <p className="font-semibold text-ink">{fb.customer_name}</p>
                    <p className="text-sm text-muted">
                      {courtName(fb.court_id)} · {DOW[fb.weekday]} {hhmm(fb.start_minutes)} ·{" "}
                      ${fb.monthly_price}/mes
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {paid ? (
                      <span className="rounded-md bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">
                        ✓ Pagado {period}
                      </span>
                    ) : charge?.checkout_url ? (
                      <>
                        <span className="text-xs text-amber-800">
                          Impago · vence {charge.due_date}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard?.writeText(charge.checkout_url!);
                            setCopiedId(fb.id);
                          }}
                          className="rounded-md border border-amber-300 px-2 py-1 text-xs font-semibold text-amber-900"
                        >
                          {copiedId === fb.id ? "¡Copiado!" : "Copiar link"}
                        </button>
                        <a
                          href={waHref(charge.checkout_url, fb.customer_name, fb.customer_phone)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-md bg-[#25D366] px-2 py-1 text-xs font-semibold text-white"
                        >
                          WhatsApp{waNumber(fb.customer_phone) ? " →" : ""}
                        </a>
                      </>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={pending}
                        onClick={() => run(() => generateFixedCharge(fb.id))}
                      >
                        Generar cobro del mes
                      </Button>
                    )}
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => run(() => deactivateFixedBooking(fb.id))}
                      className="text-xs font-semibold text-red-600"
                    >
                      Dar de baja
                    </button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
