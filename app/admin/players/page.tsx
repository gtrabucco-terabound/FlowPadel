import { getAdminContext } from "@/lib/admin/club";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import type { Tables } from "@/lib/database.types";

export const dynamic = "force-dynamic";

export default async function PlayersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const ctx = await getAdminContext();
  const supabase = await createClient();
  const term = (q ?? "").trim();

  let query = supabase
    .from("players")
    .select(
      "id, full_name, email, phone, elo_rating, matches_played, matches_won, home_club_id"
    )
    .order("elo_rating", { ascending: false })
    .limit(100);

  // Players of this club plus globals (no home club). RLS still applies.
  if (term) query = query.ilike("full_name", `%${term}%`);

  const { data } = await query;
  const all = (data ?? []) as Pick<
    Tables<"players">,
    | "id"
    | "full_name"
    | "email"
    | "phone"
    | "elo_rating"
    | "matches_played"
    | "matches_won"
    | "home_club_id"
  >[];
  const players = all.filter(
    (p) => p.home_club_id === ctx.activeClubId || p.home_club_id === null
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-ink">Jugadores</h1>

      <form className="max-w-sm">
        <input
          name="q"
          defaultValue={term}
          placeholder="Buscar por nombre…"
          className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-padel-500"
        />
      </form>

      {players.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted">
            {term ? "Sin resultados." : "No hay jugadores registrados."}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {players.map((p) => (
            <Card key={p.id}>
              <CardContent className="flex items-center gap-3 py-3">
                <Avatar name={p.full_name} className="h-9 w-9" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-ink">
                    {p.full_name}
                    {p.home_club_id === null && (
                      <span className="ml-2 text-xs font-normal text-muted">
                        global
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-muted">
                    {p.matches_won}/{p.matches_played} ganados
                    {p.email ? ` · ${p.email}` : ""}
                  </p>
                </div>
                <span className="text-sm font-bold text-padel-600">
                  {p.elo_rating}
                </span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
