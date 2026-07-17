import { getAdminContext } from "@/lib/admin/club";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { listProspectLeads } from "@/modules/clubs/repository";
import { listClubEventInvites } from "@/modules/tournaments/repository";

export const dynamic = "force-dynamic";

export default async function ProspectosPage() {
  const ctx = await getAdminContext();
  const supabase = await createClient();

  const [leads, eventInvites] = await Promise.all([
    // Clubes nombrados por jugadores que aún no están en FlowPadel (CRM).
    listProspectLeads(supabase),
    // Resumen de invitaciones automáticas de los eventos de este club.
    listClubEventInvites(supabase, ctx.activeClubId),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Prospectos</h1>
        <p className="mt-1 text-sm text-muted">
          Clubes que los jugadores nombran al armar su perfil y todavía no están
          en FlowPadel. Ordenados por cuántos jugadores los mencionaron: tu lista
          de clubes a sumar.
        </p>
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-ink">
            Clubes a captar ({leads.length})
          </h2>
        </CardHeader>
        <CardContent>
          {leads.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">
              Todavía no hay clubes sugeridos. Cuando los jugadores completen su
              perfil con un club que no está registrado, va a aparecer acá.
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
                      {l.mention_count === 1 ? "jugador" : "jugadores"} lo
                      nombraron
                    </p>
                  </div>
                  <Badge tone={l.mention_count >= 5 ? "open" : "neutral"}>
                    {l.mention_count} 🔥
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-ink">
            Invitaciones enviadas por torneo
          </h2>
          <p className="mt-1 text-sm text-muted">
            Al publicar un torneo, se invita automáticamente a los jugadores
            elegibles que pidieron recibir avisos.
          </p>
        </CardHeader>
        <CardContent>
          {eventInvites.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">
              Todavía no se generaron invitaciones. Publicá un torneo (Abierto +
              visible) para invitar a los jugadores que correspondan.
            </p>
          ) : (
            <div className="space-y-2">
              {eventInvites.map((e) => (
                <div
                  key={e.name}
                  className="flex items-center justify-between rounded-xl border border-border-soft bg-surface px-4 py-3"
                >
                  <p className="truncate font-semibold text-ink">{e.name}</p>
                  <span className="text-sm font-bold text-padel-600">
                    {e.total} invitados
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
