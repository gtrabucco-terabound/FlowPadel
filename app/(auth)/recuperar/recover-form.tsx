"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { requestPasswordReset, type RecoverState } from "./actions";

const inputCls =
  "w-full rounded-xl border border-border-strong bg-surface px-3.5 py-2.5 text-ink placeholder:text-faint outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/30";

export function RecoverForm() {
  const [state, formAction, pending] = useActionState<RecoverState, FormData>(
    requestPasswordReset,
    null
  );

  if (state && "ok" in state) {
    return (
      <div className="space-y-4 text-center">
        <div className="text-4xl">📬</div>
        <p className="text-sm text-muted">
          Si el email está registrado, te enviamos un enlace para restablecer tu
          contraseña. Revisá tu casilla (y spam).
        </p>
        <Link href="/login" className="inline-block text-sm font-semibold text-padel-600">
          Volver a ingresar
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <label className="block space-y-1">
        <span className="text-sm font-medium text-ink">Email</span>
        <input
          name="email"
          type="email"
          autoComplete="email"
          className={inputCls}
          required
        />
      </label>

      {state?.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Enviando…" : "Enviarme el enlace"}
      </Button>
    </form>
  );
}
