import { Avatar } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import type { Tables } from "@/lib/database.types";

export type RankingPlayer = Pick<
  Tables<"players">,
  "id" | "full_name" | "elo_rating" | "matches_played" | "matches_won"
>;

export function RankingList({ players }: { players: RankingPlayer[] }) {
  if (players.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border-strong bg-surface p-10 text-center text-muted">
        Todavía no hay jugadores en el ranking.
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
                  {p.matches_played} PJ · {p.matches_won} G
                </p>
              </div>
              <span
                className={
                  top
                    ? "text-lg font-semibold text-padel-600"
                    : "text-lg font-semibold text-ink"
                }
              >
                {Math.round(p.elo_rating)}
              </span>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
