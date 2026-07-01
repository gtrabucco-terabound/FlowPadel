import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import type { Tables } from "@/lib/database.types";

export type TopRankingPlayer = Pick<
  Tables<"players">,
  "id" | "full_name" | "elo_rating"
> & { club_name?: string | null };

export function TopRanking({ players }: { players: TopRankingPlayer[] }) {
  if (players.length === 0) return null;

  return (
    <section className="pb-14">
      <div className="mb-5 flex items-center justify-between gap-4">
        <h2 className="text-xl font-semibold text-ink">Top del ranking</h2>
        <Link
          href="/ranking"
          className="text-sm font-medium text-padel-600 hover:underline"
        >
          Ver ranking completo
        </Link>
      </div>
      <Card>
        <CardContent className="divide-y divide-black/5 p-0">
          {players.map((p, i) => {
            const top = i < 3;
            return (
              <div key={p.id} className="flex items-center gap-3 px-4 py-3">
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
                  {p.club_name ? (
                    <p className="truncate text-xs text-muted">{p.club_name}</p>
                  ) : null}
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
    </section>
  );
}
