"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  createClub,
  setClubActive,
  deleteClub,
  setClubPlan,
} from "@/app/admin/clubes/actions";

const inputCls =
  "w-full rounded-xl border border-border-strong bg-surface px-3.5 py-2.5 text-ink placeholder:text-faint outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/30";

export interface ClubRow {
  id: string;
  name: string;
  city: string | null;
  admins: number;
  is_active: boolean;
  has_data: boolean;
  plan_id: string | null;
}
export interface LeadRow {
  id: string;
  name: string;
  mention_count: number;
}
export interface PlanOption {
  id: string;
  name: string;
}

const ADMIN_MSG: Record<string, string> = {
  admin_asignado: "Club creado y admin asignado.",
  email_sin_cuenta:
    "Club creado. Ese email todavía no tiene cuenta — pediles que se registren y después los asignás como admin desde Miembros.",
  sin_admin: "Club creado. Asignale un admin cuando quieras.",
};

function ClubItem({ club: c, plans }: { club: ClubRow; plans: PlanOption[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) => {
    setError(null);
    start(async () => {
      const r = await fn();
      if (!r.ok) setError(r.error ?? "Error");
      else router.refresh();
    });
  };

  const onDelete = () => {
    if (
      !window.confirm(
        `¿Eliminar "${c.name}" definitivamente? Esta acción no se puede deshacer.`
      )
    )
      return;
    run(() => deleteClub(c.id));
  };

  return (
    <div
      className={`flex flex-wrap items-center gap-3 rounded-xl border px-4 py-3 ${
        c.is_active ? "border-border-soft bg-surface" : "border-border-soft bg-surface/50 opacity-70"
      }`}
    >
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-ink">
          {c.name}{" "}
          {!c.is_active && (
            <span className="align-middle text-xs font-normal text-muted">· inactivo</span>
          )}
        </p>
        <p className="text-xs text-muted">
          {c.city ?? "Sin ciudad"} · {c.admins} {c.admins === 1 ? "miembro" : "miembros"}
        </p>
        {error && <p className="mt-1 text-xs font-semibold text-red-500">{error}</p>}
      </div>
      <div className="flex items-center gap-2">
        <select
          aria-label="Plan del club"
          disabled={pending}
          value={c.plan_id ?? ""}
          onChange={(e) => run(() => setClubPlan(c.id, e.target.value || null))}
          className="rounded-lg border border-border-soft bg-surface px-2 py-1.5 text-xs text-ink outline-none focus:border-accent"
        >
          <option value="">Sin plan (todo)</option>
          {plans.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() => run(() => setClubActive(c.id, !c.is_active))}
        >
          {c.is_active ? "Desactivar" : "Activar"}
        </Button>
        <button
          type="button"
          disabled={pending || c.has_data}
          onClick={onDelete}
          title={
            c.has_data
              ? "Tiene eventos o reservas: desactivalo en lugar de eliminarlo"
              : "Eliminar definitivamente"
          }
          className="text-xs font-semibold text-red-500 disabled:cursor-not-allowed disabled:text-faint"
        >
          Eliminar
        </button>
      </div>
    </div>
  );
}

export function ClubesManager({
  clubs,
  leads,
  plans,
}: {
  clubs: ClubRow[];
  leads: LeadRow[];
  plans: PlanOption[];
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
            <ClubItem key={c.id} club={c} plans={plans} />
          ))}
        </div>
      </div>
    </div>
  );
}
