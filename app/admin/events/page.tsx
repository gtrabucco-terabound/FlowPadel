import { requireFeature } from "@/lib/admin/club";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { eventStatusMeta, eventTypeLabel, formatDate } from "@/lib/format";
import { EventListRow } from "@/components/admin/event-list-row";
import { NewEventDialog } from "@/components/admin/new-event-dialog";
import { InterclubChallenges } from "@/components/admin/interclub-challenges";
import {
  listClubEvents,
  listInterclubChallenges,
} from "@/modules/tournaments/repository";

export const dynamic = "force-dynamic";

export default async function EventsPage() {
  const ctx = await requireFeature("tournaments");
  const supabase = await createClient();

  const [rows, challenges] = await Promise.all([
    listClubEvents(supabase, ctx.activeClubId),
    // Desafíos interclub recibidos (con el nombre del organizador resuelto).
    listInterclubChallenges(supabase, ctx.activeClubId),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-ink">Eventos</h1>
        <NewEventDialog />
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
              <EventListRow
                key={e.id}
                id={e.id}
                name={e.name}
                subtitle={`${eventTypeLabel(e.event_type)} · ${formatDate(e.start_date)}`}
                statusLabel={meta.label}
                statusTone={meta.tone}
                isDraft={e.status === "draft"}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
