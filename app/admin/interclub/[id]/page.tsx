import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdminContext } from "@/lib/admin/club";
import { createClient } from "@/lib/supabase/server";
import {
  getLigaAny,
  listTeams,
  listSeries,
  listPairs,
  listAllLines,
  listClubPlayerNames,
} from "@/modules/interclub/repository";
import { LigaManager } from "@/components/admin/interclub-manager";

export const dynamic = "force-dynamic";

export default async function InterclubLigaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await getAdminContext();
  const supabase = await createClient();

  const liga = await getLigaAny(supabase, id);
  if (!liga) notFound();

  const isOrganizer = liga.club_id === ctx.activeClubId;

  const [teams, series, pairs, lines, players] = await Promise.all([
    listTeams(supabase, id),
    listSeries(supabase, id),
    listPairs(supabase, id),
    listAllLines(supabase, id),
    listClubPlayerNames(supabase, ctx.activeClubId),
  ]);

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Link href="/admin/interclub" className="text-sm font-semibold text-accent">
          ← Interclub
        </Link>
        <h1 className="mt-1 text-2xl font-semibold text-ink">{liga.name}</h1>
        <p className="text-sm text-muted">
          Liga por equipos: todos contra todos. Cada serie es club vs club (gana el que
          gana más categorías).
        </p>
      </div>

      <LigaManager
        ligaId={liga.id}
        joinCode={liga.join_code}
        isOrganizer={isOrganizer}
        myClubId={ctx.activeClubId}
        categories={liga.categories ?? []}
        pairsPerCat={(liga.pairs_per_cat ?? {}) as Record<string, number>}
        teams={teams}
        pairs={pairs}
        series={series}
        lines={lines}
        players={players}
      />
    </div>
  );
}
