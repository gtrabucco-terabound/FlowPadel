"use client";

import { useState, useTransition } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Plan, PlatformSettings } from "@/modules/plans/repository";
import {
  savePlan,
  togglePlan,
  removePlan,
  saveSettings,
} from "@/app/admin/plataforma/actions";

type Result = { ok: true } | { ok: false; error: string };

function useRun() {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const run = (fn: () => Promise<Result>, okText = "Guardado ✓") =>
    start(async () => {
      setMsg(null);
      const r = await fn();
      setMsg(r.ok ? { ok: true, text: okText } : { ok: false, text: r.error });
    });
  return { run, pending, msg };
}

const input =
  "w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-accent";
const lab = "block text-xs font-medium text-ink";

const TOGGLES: { key: keyof Plan; label: string }[] = [
  { key: "f_reservations", label: "Reservas y agenda" },
  { key: "f_fixed_bookings", label: "Turnos fijos" },
  { key: "f_tournaments", label: "Torneos y ranking" },
  { key: "f_payments_mp", label: "Cobros Mercado Pago" },
  { key: "f_occupancy", label: "Motor de ocupación" },
  { key: "f_whatsapp_bot", label: "Bot de WhatsApp" },
  { key: "f_lessons", label: "Clases y entrenamientos" },
];

function PlanFields({ plan }: { plan?: Plan }) {
  return (
    <div className="space-y-3">
      {plan && <input type="hidden" name="id" value={plan.id} />}
      <div className="grid grid-cols-2 gap-3">
        <label className="space-y-1">
          <span className={lab}>Nombre</span>
          <input name="name" defaultValue={plan?.name ?? ""} required className={input} />
        </label>
        <label className="space-y-1">
          <span className={lab}>Badge (ej. Recomendado)</span>
          <input name="badge" defaultValue={plan?.badge ?? ""} className={input} />
        </label>
      </div>
      <label className="space-y-1 block">
        <span className={lab}>Descripción</span>
        <input name="description" defaultValue={plan?.description ?? ""} className={input} />
      </label>
      <div className="grid grid-cols-3 gap-3">
        <label className="space-y-1">
          <span className={lab}>Precio (vacío = a confirmar)</span>
          <input
            name="price_amount"
            type="number"
            min={0}
            defaultValue={plan?.price_amount != null ? String(plan.price_amount) : ""}
            className={input}
          />
        </label>
        <label className="space-y-1">
          <span className={lab}>Moneda</span>
          <input name="currency" defaultValue={plan?.currency ?? "ARS"} className={input} />
        </label>
        <label className="space-y-1">
          <span className={lab}>Orden</span>
          <input name="sort_order" type="number" defaultValue={String(plan?.sort_order ?? 0)} className={input} />
        </label>
      </div>

      <div>
        <p className={`${lab} mb-1`}>Funciones incluidas</p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          {TOGGLES.map((t) => (
            <label key={String(t.key)} className="flex items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                name={String(t.key)}
                defaultChecked={plan ? Boolean(plan[t.key]) : true}
                className="h-4 w-4 accent-accent"
              />
              {t.label}
            </label>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="space-y-1">
          <span className={lab}>Alcance de comunidad</span>
          <select
            name="community_scope"
            defaultValue={plan?.community_scope ?? "club"}
            className={input}
          >
            <option value="club">Solo jugadores de tu club</option>
            <option value="platform">Todos los jugadores de la plataforma</option>
          </select>
        </label>
        <div className="flex items-end gap-4 pb-1">
          <label className="flex items-center gap-2 text-sm text-ink">
            <input type="checkbox" name="founder_eligible" defaultChecked={plan?.founder_eligible ?? false} className="h-4 w-4 accent-accent" />
            Admite Fundador
          </label>
          <label className="flex items-center gap-2 text-sm text-ink">
            <input type="checkbox" name="is_active" defaultChecked={plan?.is_active ?? true} className="h-4 w-4 accent-accent" />
            Visible en landing
          </label>
        </div>
      </div>
    </div>
  );
}

function PlanCard({ plan }: { plan: Plan }) {
  const { run, pending, msg } = useRun();
  return (
    <Card>
      <CardContent className="py-5">
        <details>
          <summary className="flex cursor-pointer items-center justify-between gap-3">
            <span className="font-semibold text-ink">
              {plan.name}{" "}
              {!plan.is_active && (
                <span className="text-xs font-normal text-muted">(oculto)</span>
              )}
            </span>
            <span className="text-xs text-muted">
              {plan.price_amount != null ? `$${plan.price_amount}/${plan.period}` : "a confirmar"}
            </span>
          </summary>
          <form action={(fd) => run(() => savePlan(fd))} className="mt-4 space-y-3">
            <PlanFields plan={plan} />
            {msg && (
              <p className={`text-sm font-semibold ${msg.ok ? "text-emerald-500" : "text-red-500"}`}>
                {msg.text}
              </p>
            )}
            <div className="flex items-center gap-2">
              <Button type="submit" size="sm" disabled={pending}>
                {pending ? "Guardando…" : "Guardar"}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={pending}
                onClick={() => run(() => togglePlan(plan.id, !plan.is_active), plan.is_active ? "Ocultado" : "Publicado")}
              >
                {plan.is_active ? "Ocultar" : "Publicar"}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={pending}
                onClick={() => {
                  if (confirm(`¿Eliminar el plan "${plan.name}"?`))
                    run(() => removePlan(plan.id), "Eliminado");
                }}
              >
                Eliminar
              </Button>
            </div>
          </form>
        </details>
      </CardContent>
    </Card>
  );
}

function NewPlan() {
  const { run, pending, msg } = useRun();
  return (
    <Card>
      <CardContent className="py-5">
        <details>
          <summary className="cursor-pointer font-semibold text-padel-600">
            + Crear plan nuevo
          </summary>
          <form action={(fd) => run(() => savePlan(fd), "Plan creado ✓")} className="mt-4 space-y-3">
            <PlanFields />
            {msg && (
              <p className={`text-sm font-semibold ${msg.ok ? "text-emerald-500" : "text-red-500"}`}>
                {msg.text}
              </p>
            )}
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? "Creando…" : "Crear plan"}
            </Button>
          </form>
        </details>
      </CardContent>
    </Card>
  );
}

function SettingsCard({ settings }: { settings: PlatformSettings }) {
  const { run, pending, msg } = useRun();
  const roi = [...settings.roi];
  while (roi.length < 4) roi.push({ value: "", label: "", note: "" });

  return (
    <Card>
      <CardContent className="space-y-4 py-5">
        <h2 className="text-lg font-bold text-ink">Programa Fundadores y ROI</h2>
        <form action={(fd) => run(() => saveSettings(fd))} className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <label className="space-y-1">
              <span className={lab}>Descuento (%)</span>
              <input name="founder_discount_pct" type="number" min={0} max={100} defaultValue={String(settings.founder_discount_pct)} className={input} />
            </label>
            <label className="space-y-1">
              <span className={lab}>Años</span>
              <input name="founder_years" type="number" min={1} defaultValue={String(settings.founder_years)} className={input} />
            </label>
            <label className="space-y-1">
              <span className={lab}>Cupos totales</span>
              <input name="founder_slots_total" type="number" min={0} defaultValue={String(settings.founder_slots_total)} className={input} />
            </label>
            <label className="space-y-1">
              <span className={lab}>Cupos tomados</span>
              <input name="founder_slots_taken" type="number" min={0} defaultValue={String(settings.founder_slots_taken)} className={input} />
            </label>
          </div>

          <label className="block space-y-1">
            <span className={lab}>
              Precio de referencia · 1 hora de cancha (para el ejemplo de la landing)
            </span>
            <input
              name="ref_court_hour_price"
              type="number"
              min={0}
              defaultValue={String(settings.ref_court_hour_price)}
              className={`${input} max-w-xs`}
            />
          </label>

          <div>
            <p className={`${lab} mb-1`}>Métricas de la landing (ROI)</p>
            <div className="space-y-2">
              {roi.slice(0, 4).map((m, i) => (
                <div key={i} className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <input name={`roi_${i}_value`} defaultValue={m.value} placeholder="Valor (ej. ≈30%)" className={input} />
                  <input name={`roi_${i}_label`} defaultValue={m.label} placeholder="Título" className={input} />
                  <input name={`roi_${i}_note`} defaultValue={m.note} placeholder="Detalle" className={input} />
                </div>
              ))}
            </div>
          </div>

          {msg && (
            <p className={`text-sm font-semibold ${msg.ok ? "text-emerald-500" : "text-red-500"}`}>
              {msg.text}
            </p>
          )}
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? "Guardando…" : "Guardar configuración"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export function PlataformaManager({
  plans,
  settings,
}: {
  plans: Plan[];
  settings: PlatformSettings;
}) {
  return (
    <div className="max-w-3xl space-y-6">
      <SettingsCard settings={settings} />
      <div>
        <h2 className="mb-3 text-lg font-bold text-ink">Planes</h2>
        <div className="space-y-3">
          {plans.map((p) => (
            <PlanCard key={p.id} plan={p} />
          ))}
          <NewPlan />
        </div>
      </div>
    </div>
  );
}
