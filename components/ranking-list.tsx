import { Avatar } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";

export type RankingPlayer = {
  id: string;
  full_name: string;
  apa_points: number;
  tournaments: number;
  elo_rating: number;
};

export function RankingList({ players }: { players: RankingPlayer[] }) {
  if (players.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border-strong bg-surface p-10 text-center text-muted">
        Todavía no hay puntos en el ranking. Se suman al jugar torneos (según la
        ronda que alcances).
      </div>
    );
  }

  return (
    <Card>
      <CardContent className="divide-y divide-black/5 p-0">
        {players.map((p, i) => {
          const top = i < 3;
          return (
            <div
              key={p.id}
              className="flex items-center gap-3 px-4 py-3"
            >
              <span
                className={
                  top
                    ? "flex h-6 w-6 items-center justify-center rounded-full bg-accent text-center text-xs font-semibold text-accent-ink"
                    : "w-6 text-center text-sm font-semibold text-muted"
                }
              >
                {i + 1}
              </span>
              <Avatar name={p.full_name} className="h-9 w-9" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-ink">{p.full_name}</p>
                <p className="text-xs text-muted">
                  {p.tournaments} {p.tournaments === 1 ? "torneo" : "torneos"} · nivel {Math.round(p.elo_rating)}
                </p>
              </div>
              <span className="text-right">
                <span
                  className={
                    top
                      ? "block text-lg font-semibold text-padel-600"
                      : "block text-lg font-semibold text-ink"
                  }
                >
                  {p.apa_points}
                </span>
                <span className="text-[10px] uppercase tracking-wide text-muted">pts</span>
              </span>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
