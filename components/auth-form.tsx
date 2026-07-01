"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import type { AuthState } from "@/app/(auth)/actions";

type Action = (prev: AuthState, formData: FormData) => Promise<AuthState>;

const inputCls =
  "w-full rounded-xl border border-border-strong bg-surface px-3.5 py-2.5 text-ink placeholder:text-faint outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/30";

export function AuthForm({
  action,
  mode,
}: {
  action: Action;
  mode: "login" | "signup";
}) {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(
    action,
    null
  );

  return (
    <form action={formAction} className="space-y-4">
      {mode === "signup" && (
        <label className="block space-y-1">
          <span className="text-sm font-medium text-ink">Nombre completo</span>
          <input name="full_name" className={inputCls} required />
        </label>
      )}

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

      <label className="block space-y-1">
        <span className="text-sm font-medium text-ink">Contraseña</span>
        <input
          name="password"
          type="password"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
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
        {pending
          ? "Procesando…"
          : mode === "login"
            ? "Ingresar"
            : "Crear cuenta"}
      </Button>
    </form>
  );
}
