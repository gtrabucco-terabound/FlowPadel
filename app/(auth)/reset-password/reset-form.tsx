"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { updatePasswordAction, type ResetState } from "./actions";

const inputCls =
  "w-full rounded-xl border border-border-strong bg-surface px-3.5 py-2.5 text-ink placeholder:text-faint outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/30";

export function ResetForm() {
  const [state, formAction, pending] = useActionState<ResetState, FormData>(
    updatePasswordAction,
    null
  );

  return (
    <form action={formAction} className="space-y-4">
      <label className="block space-y-1">
        <span className="text-sm font-medium text-ink">Nueva contraseña</span>
        <input
          name="password"
          type="password"
          autoComplete="new-password"
          className={inputCls}
          required
          minLength={6}
        />
      </label>
      <label className="block space-y-1">
        <span className="text-sm font-medium text-ink">Repetir contraseña</span>
        <input
          name="confirm"
          type="password"
          autoComplete="new-password"
          className={inputCls}
          required
          minLength={6}
        />
      </label>

      {state?.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Guardando…" : "Cambiar contraseña"}
      </Button>
    </form>
  );
}
