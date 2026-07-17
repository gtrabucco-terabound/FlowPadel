import { createClient } from "@/lib/supabase/server";
import {
  TournamentsFiltered,
  type TournamentItem,
} from "@/components/tournaments-filtered";
import { listPublicTournaments } from "@/modules/tournaments/repository";

export const dynamic = "force-dynamic";

type EventRow = {
  id: string;
  name: string;
  slug: string;
  event_type: TournamentItem["event_type"];
  status: TournamentItem["status"];
  start_date: string | null;
  end_date: string | null;
  modality: TournamentItem["modality"];
  category_system: TournamentItem["category_system"];
  category_value: string | null;
  club: { id: string; name: string | null; city: string | null } | null;
};

export default async function TorneosPage() {
  const supabase = await createClient();

  const rows = (await listPublicTournaments(supabase)) as unknown as EventRow[];

  const tournaments: TournamentItem[] = rows.map((r) => ({
    id: r.id,
    name: r.name,
    slug: r.slug,
    event_type: r.event_type,
    status: r.status,
    start_date: r.start_date,
    end_date: r.end_date,
    modality: r.modality,
    category_system: r.category_system,
    category_value: r.category_value,
    club: r.club ? { name: r.club.name } : null,
    clubId: r.club?.id ?? null,
    clubName: r.club?.name ?? null,
  }));

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-2xl font-semibold text-ink">Torneos</h1>
      <p className="mb-8 text-muted">Todos los torneos de la comunidad.</p>
      <TournamentsFiltered tournaments={tournaments} />
    </div>
  );
}
