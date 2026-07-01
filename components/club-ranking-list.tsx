import { Card, CardContent } from "@/components/ui/card";

export interface ClubRankingRow {
  club_id: string;
  club_name: string;
  city: string | null;
  total_points: number;
  players_count: number;
  tournaments_count: number;
}

export function ClubRankingList({ clubs }: { clubs: ClubRankingRow[] }) {
  if (clubs.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border-strong bg-surface p-10 text-center text-muted">
        Todavía no hay clubes con puntos en el ranking.
      </div>
    );
  }

  return (
    <Card>
      <CardContent className="divide-y divide-black/5 p-0">
        {clubs.map((c, i) => {
          const top = i < 3;
          return (
            <div key={c.club_id} className="flex items-center gap-3 px-4 py-3">
              <span
                className={
                  top
                    ? "flex h-6 w-6 items-center justify-center rounded-full bg-accent text-center text-xs font-semibold text-accent-ink"
                    : "w-6 text-center text-sm font-semibold text-muted"
                }
              >
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-ink">{c.club_name}</p>
                <p className="text-xs text-muted">
                  {c.city ? `${c.city} · ` : ""}
                  {c.players_count} jugadores · {c.tournaments_count} torneos
                </p>
              </div>
              <span
                className={
                  top
                    ? "text-lg font-semibold text-padel-600"
                    : "text-lg font-semibold text-ink"
                }
              >
                {c.total_points} pts
              </span>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
