"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import {
  updateMyPlayerProfile,
  type ProfileState,
} from "@/app/perfil/actions";
import type { Enums } from "@/lib/database.types";

const inputCls =
  "w-full rounded-xl border border-border-strong bg-surface px-3.5 py-2.5 text-ink placeholder:text-faint outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/30";

export interface ProfileFormProps {
  email: string;
  fullName: string;
  gender: Enums<"gender"> | null;
  category: number | null;
  homeClubId: string | null;
  clubs: { id: string; name: string }[];
}

const CATEGORY_OPTIONS = [
  { value: 1, label: "1ra" },
  { value: 2, label: "2da" },
  { value: 3, label: "3ra" },
  { value: 4, label: "4ta" },
  { value: 5, label: "5ta" },
  { value: 6, label: "6ta" },
  { value: 7, label: "7ma" },
  { value: 8, label: "8va" },
  { value: 9, label: "9na" },
];

export function ProfileForm({
  email,
  fullName,
  gender,
  category,
  homeClubId,
  clubs,
}: ProfileFormProps) {
  const [state, formAction, pending] = useActionState<ProfileState, FormData>(
    updateMyPlayerProfile,
    null
  );

  return (
    <form action={formAction} className="space-y-4">
      <label className="block space-y-1">
        <span className="text-sm font-medium text-ink">Nombre completo</span>
        <input
          name="full_name"
          defaultValue={fullName}
          className={inputCls}
          required
          minLength={2}
        />
      </label>

      <label className="block space-y-1">
        <span className="text-sm font-medium text-ink">Email</span>
        <input
          value={email}
          readOnly
          disabled
          className={`${inputCls} cursor-not-allowed opacity-60`}
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block space-y-1">
          <span className="text-sm font-medium text-ink">Género</span>
          <select
            name="gender"
            defaultValue={gender ?? ""}
            className={inputCls}
          >
            <option value="">Sin especificar</option>
            <option value="male">Hombre</option>
            <option value="female">Mujer</option>
          </select>
        </label>

        <label className="block space-y-1">
          <span className="text-sm font-medium text-ink">Categoría</span>
          <select
            name="category"
            defaultValue={category ?? ""}
            className={inputCls}
          >
            <option value="">Sin categoría</option>
            {CATEGORY_OPTIONS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="block space-y-1">
        <span className="text-sm font-medium text-ink">
          Club que representás
        </span>
        <select
          name="home_club_id"
          defaultValue={homeClubId ?? ""}
          className={inputCls}
        >
          <option value="">Sin club</option>
          {clubs.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>

      {state && "error" in state && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}
      {state && "ok" in state && (
        <p className="rounded-lg bg-positive/15 px-3 py-2 text-sm text-positive">
          Datos guardados.
        </p>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? "Guardando…" : "Guardar cambios"}
      </Button>
    </form>
  );
}
