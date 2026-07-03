"use client";

import { useActionState, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createClub } from "@/app/admin/clubes/actions";

const inputCls =
  "w-full rounded-xl border border-border-strong bg-surface px-3.5 py-2.5 text-ink placeholder:text-faint outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/30";

export interface ClubRow {
  id: string;
  name: string;
  city: string | null;
  admins: number;
}
export interface LeadRow {
  id: string;
  name: string;
  mention_count: number;
}

const ADMIN_MSG: Record<string, string> = {
  admin_asignado: "Club creado y admin asignado.",
  email_sin_cuenta:
    "Club creado. Ese email todavía no tiene cuenta — pediles que se registren y después los asignás como admin desde Miembros.",
  sin_admin: "Club creado. Asignale un admin cuando quieras.",
};

export function ClubesManager({
  clubs,
  leads,
}: {
  clubs: ClubRow[];
  leads: LeadRow[];
}) {
  const [state, formAction, pending] = useActionState(createClub, null);
  const nameRef = useRef<HTMLInputElement>(null);
  const [leadId, setLeadId] = useState("");

  function fillFromLead(l: LeadRow) {
    if (nameRef.current) nameRef.current.value = l.name;
    setLeadId(l.id);
    nameRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    nameRef.current?.focus();
  }

  return (
    <div className="space-y-8">
      {/* Crear club */}
      <div className="rounded-2xl border border-border-soft bg-canvas p-5">
        <h2 className="mb-4 text-lg font-semibold text-ink">Crear un club</h2>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="lead_id" value={leadId} />
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-1">
              <span className="text-sm font-medium text-ink">Nombre del club</span>
              <input ref={nameRef} name="name" className={inputCls} required minLength={2} />
            </label>
            <label className="block space-y-1">
              <span className="text-sm font-medium text-ink">Ciudad</span>
              <input name="city" className={inputCls} placeholder="Opcional" />
            </label>
          </div>
          <label className="block space-y-1">
            <span className="text-sm font-medium text-ink">
              Email del admin del club <span className="text-muted">(opcional)</span>
            </span>
            <input
              name="admin_email"
              type="email"
              className={inputCls}
              placeholder="La persona que gestionará el club (debe tener cuenta)"
            />
          </label>

          {leadId && (
            <p className="text-xs text-muted">
              Creando desde un club sugerido del CRM. ·{" "}
              <button
                type="button"
                onClick={() => setLeadId("")}
                className="font-medium text-padel-600"
              >
                cancelar
              </button>
            </p>
          )}

          {state && !state.ok && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {state.error}
            </p>
          )}
          {state && state.ok && (
            <p className="rounded-lg bg-positive/15 px-3 py-2 text-sm text-positive">
              {ADMIN_MSG[state.adminStatus] ?? "Club creado."}
            </p>
          )}

          <Button type="submit" disabled={pending}>
            {pending ? "Creando…" : "Crear club"}
          </Button>
        </form>
      </div>

      {/* Clubes sugeridos (CRM) */}
      <div>
        <h2 className="mb-1 text-lg font-semibold text-ink">
          Clubes sugeridos por jugadores ({leads.length})
        </h2>
        <p className="mb-3 text-sm text-muted">
          Nombrados en el perfil de jugadores y aún no registrados. Creá el club
          con un clic (queda vinculado al lead).
        </p>
        {leads.length === 0 ? (
          <p className="rounded-xl border border-border-soft bg-surface px-4 py-6 text-center text-sm text-muted">
            No hay clubes sugeridos todavía.
          </p>
        ) : (
          <div className="space-y-2">
            {leads.map((l) => (
              <div
                key={l.id}
                className="flex items-center gap-3 rounded-xl border border-border-soft bg-surface px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-ink">{l.name}</p>
                  <p className="text-xs text-muted">
                    {l.mention_count}{" "}
                    {l.mention_count === 1 ? "jugador lo nombró" : "jugadores lo nombraron"}
                  </p>
                </div>
                <Badge tone={l.mention_count >= 5 ? "open" : "neutral"}>
                  {l.mention_count} 🔥
                </Badge>
                <Button type="button" size="sm" variant="outline" onClick={() => fillFromLead(l)}>
                  Crear club
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Clubes existentes */}
      <div>
        <h2 className="mb-3 text-lg font-semibold text-ink">
          Clubes registrados ({clubs.length})
        </h2>
        <div className="space-y-2">
          {clubs.map((c) => (
            <div
              key={c.id}
              className="flex items-center gap-3 rounded-xl border border-border-soft bg-surface px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-ink">{c.name}</p>
                <p className="text-xs text-muted">{c.city ?? "Sin ciudad"}</p>
              </div>
              <span className="text-xs text-muted">
                {c.admins} {c.admins === 1 ? "miembro" : "miembros"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
