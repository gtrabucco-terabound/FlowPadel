"use client";

import { useActionState } from "react";
import { requestDemo, type DemoState } from "@/app/clubes/actions";
import { Button } from "@/components/ui/button";

const inputCls =
  "w-full rounded-xl border border-border-strong bg-surface px-3.5 py-2.5 text-ink placeholder:text-faint outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/30";

export function DemoRequestForm() {
  const [state, formAction, pending] = useActionState<DemoState, FormData>(
    requestDemo,
    null
  );

  if (state?.ok) {
    return (
      <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-6 text-center">
        <p className="text-lg font-semibold text-emerald-300">
          ✓ ¡Solicitud enviada!
        </p>
        <p className="mt-1 text-sm text-muted">
          Te contactamos en las próximas horas para coordinar la demo.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block space-y-1">
          <span className="text-xs font-medium text-ink">Nombre del club</span>
          <input name="club_name" required className={inputCls} placeholder="Club Norte" />
        </label>
        <label className="block space-y-1">
          <span className="text-xs font-medium text-ink">Tu nombre</span>
          <input name="contact_name" required className={inputCls} placeholder="Nombre y apellido" />
        </label>
        <label className="block space-y-1">
          <span className="text-xs font-medium text-ink">Email</span>
          <input name="email" type="email" className={inputCls} placeholder="vos@club.com" />
        </label>
        <label className="block space-y-1">
          <span className="text-xs font-medium text-ink">WhatsApp / teléfono</span>
          <input name="phone" inputMode="tel" className={inputCls} placeholder="11 2233 4455" />
        </label>
      </div>
      <label className="block space-y-1">
        <span className="text-xs font-medium text-ink">
          Mensaje <span className="text-faint">(opcional)</span>
        </span>
        <textarea
          name="message"
          rows={2}
          className={inputCls}
          placeholder="Contanos cuántas canchas tenés o qué te interesa."
        />
      </label>

      {state && !state.ok && (
        <p className="text-sm font-semibold text-red-500">{state.error}</p>
      )}

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Enviando…" : "Solicitar demo gratis"}
      </Button>
      <p className="text-center text-xs text-muted">
        Sin costo ni compromiso. Te mostramos la plataforma con tu club.
      </p>
    </form>
  );
}
