import Link from "next/link";
import { getAdminContext } from "@/lib/admin/club";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { eventStatusMeta, eventTypeLabel, formatDate } from "@/lib/format";
import { NewEventDialog } from "@/components/admin/new-event-dialog";
import { InterclubChallenges } from "@/components/admin/interclub-challenges";
import type { Tables } from "@/lib/database.types";

export const dynamic = "force-dynamic";

type ChallengeRow = Pick<
  Tables<"events">,
  "id" | "name" | "slug" | "start_date" | "modality" | "club_id"
>;

export default async function EventsPage() {
  const ctx = await getAdminContext();
  const supabase = await createClient();

  const [{ data }, { data: clubData }, { data: challengeData }] =
    await Promise.all([
      supabase
        .from("events")
        .select("id, name, slug, status, start_date, event_type, max_teams")
        .eq("club_id", ctx.activeClubId)
        .order("created_at", { ascending: false }),
      // Clubs disponibles como rival (todos menos el activo).
      supabase
        .from("clubs")
        .select("id, name")
        .neq("id", ctx.activeClubId)
        .order("name", { ascending: true }),
      // Desafíos interclub recibidos: nos retan y aún no aceptamos.
      supabase
        .from("events")
        .select("id, name, slug, start_date, modality, club_id")
        .eq("rival_club_id", ctx.activeClubId)
        .eq("is_interclub", true)
        .eq("rival_accepted", false)
        .order("created_at", { ascending: false }),
    ]);

  const rows = (data ?? []) as Pick<
    Tables<"events">,
    "id" | "name" | "slug" | "status" | "start_date" | "event_type" | "max_teams"
  >[];

  const rivalClubs = (clubData ?? []) as { id: string; name: string }[];
  const challenges = (challengeData ?? []) as ChallengeRow[];

  // Resolver nombres de los clubs organizadores de los desafíos.
  const organizerIds = Array.from(new Set(challenges.map((c) => c.club_id)));
  const clubNames = new Map<string, string>();
  if (organizerIds.length > 0) {
    const { data: orgs } = await supabase
      .from("clubs")
      .select("id, name")
      .in("id", organizerIds);
    for (const o of (orgs ?? []) as { id: string; name: string }[]) {
      clubNames.set(o.id, o.name);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-ink">Eventos</h1>
        <NewEventDialog rivalClubs={rivalClubs} />
      </div>

      {challenges.length > 0 && (
        <InterclubChallenges
          challenges={challenges.map((c) => ({
            id: c.id,
            name: c.name,
            startDate: c.start_date,
            organizerName: clubNames.get(c.club_id) ?? "Club",
          }))}
        />
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
