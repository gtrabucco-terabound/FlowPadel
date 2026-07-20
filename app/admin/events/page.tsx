import Link from "next/link";
import { getAdminContext } from "@/lib/admin/club";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { eventStatusMeta, eventTypeLabel, formatDate } from "@/lib/format";
import { NewEventDialog } from "@/components/admin/new-event-dialog";
import { InterclubChallenges } from "@/components/admin/interclub-challenges";
import {
  listClubEvents,
  listInterclubChallenges,
} from "@/modules/tournaments/repository";
import { listOtherClubs } from "@/modules/clubs/repository";

export const dynamic = "force-dynamic";

export default async function EventsPage() {
  const ctx = await getAdminContext();
  const supabase = await createClient();

  const [rows, rivalClubs, challenges] = await Promise.all([
    listClubEvents(supabase, ctx.activeClubId),
    // Clubs disponibles como rival (todos menos el activo).
    listOtherClubs(supabase, ctx.activeClubId),
    // Desafíos interclub recibidos (con el nombre del organizador resuelto).
    listInterclubChallenges(supabase, ctx.activeClubId),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-ink">Eventos</h1>
        <NewEventDialog rivalClubs={rivalClubs} />
      </div>

      {challenges.length > 0 && (
        <InterclubChallenges challenges={challenges} />
      )}

      {rows.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted">
            No hay eventos todavía. Creá el primero con “Nuevo evento”.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {rows.map((e) => {
            const meta = eventStatusMeta(e.status);
            return (
              <Link key={e.id} href={`/admin/events/${e.id}`}>
                <Card className="transition-colors hover:border-padel-200">
                  <CardContent className="flex items-center justify-between gap-3 py-4">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-ink">{e.name}</p>
                      <p className="text-xs text-muted">
                        {eventTypeLabel(e.event_type)} · {formatDate(e.start_date)}
                      </p>
                    </div>
                    <Badge tone={meta.tone}>{meta.label}</Badge>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
