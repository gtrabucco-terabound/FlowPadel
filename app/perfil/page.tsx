import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProfileForm } from "@/components/profile-form";
import { formatModalityCategory } from "@/lib/format";
import type { Enums, Tables, TablesInsert } from "@/lib/database.types";

export const dynamic = "force-dynamic";

type StandingRow = Pick<
  Tables<"player_standings">,
  "id" | "played" | "won" | "lost" | "points" | "position"
> & {
  event: Pick<
    Tables<"events">,
    | "id"
    | "name"
    | "slug"
    | "status"
    | "modality"
    | "category_system"
    | "category_value"
  > | null;
};

export default async function PerfilPage({
  searchParams,
}: {
  searchParams: Promise<{ welcome?: string }>;
}) {
  const { welcome } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Profile (auth-backed). Should exist for any authenticated user.
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, full_name, player_id")
    .eq("id", user.id)
    .maybeSingle();

  const email = profile?.email ?? user.email ?? "";
  const profileName = profile?.full_name ?? user.email ?? "Jugador";

  // Ensure a player row linked to this profile exists.
  let { data: player } = await supabase
    .from("players")
    .select(
      "id, full_name, first_name, birthdate, email, gender, category, hand, home_club_id, club_lead_id, photo_url, notify_enabled, notify_mixto, notify_inapp, notify_email, notify_telegram, notify_whatsapp, elo_rating, matches_played, matches_won"
    )
    .eq("profile_id", user.id)
    .maybeSingle();

  if (!player) {
    const insert: TablesInsert<"players"> = {
      profile_id: user.id,
      full_name: profileName,
      email,
    };
    const { data: created } = await supabase
      .from("players")
      .insert(insert)
      .select(
        "id, full_name, first_name, birthdate, email, gender, category, hand, home_club_id, club_lead_id, photo_url, notify_enabled, notify_mixto, notify_inapp, notify_email, notify_telegram, notify_whatsapp, elo_rating, matches_played, matches_won"
      )
      .single();
    player = created ?? null;

    // Link profiles.player_id back to the new player row.
    if (created) {
      await supabase
        .from("profiles")
        .update({ player_id: created.id })
        .eq("id", user.id);
    }
  } else if (profile && profile.player_id !== player.id) {
    // Keep the profile link in sync.
    await supabase
      .from("profiles")
      .update({ player_id: player.id })
      .eq("id", user.id);
  }

  // Clubs for the select.
  const { data: clubsData } = await supabase
    .from("clubs")
    .select("id, name")
    .order("name", { ascending: true });
  const clubs = (clubsData ?? []) as { id: string; name: string }[];

  // Nombre del club-lead (si el jugador nombró un club no registrado).
  let clubOther: string | null = null;
  if (player?.club_lead_id) {
    const { data: lead } = await supabase
      .from("club_leads")
      .select("name")
      .eq("id", player.club_lead_id)
      .maybeSingle();
    clubOther = lead?.name ?? null;
  }

  // "Mi seguimiento": tournaments where the player has standings.
  let standings: StandingRow[] = [];
  if (player) {
    const { data: standingsData } = await supabase
      .from("player_standings")
      .select(
        "id, played, won, lost, points, position, event:events(id, name, slug, status, modality, category_system, category_value)"
      )
      .eq("player_id", player.id)
      .order("created_at", { ascending: false });
    standings = (standingsData ?? []) as unknown as StandingRow[];
  }

  // Puntos aportados al club que representa el jugador.
  let clubContribution: { clubName: string; points: number } | null = null;
  if (player?.home_club_id) {
    const totalPoints = standings.reduce((sum, s) => sum + (s.points ?? 0), 0);
    const clubName =
      clubs.find((c) => c.id === player.home_club_id)?.name ?? "tu club";
    clubContribution = { clubName, points: totalPoints };
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-10">
      <div>
        <h1 className="text-2xl font-semibold text-ink">
          {welcome ? "¡Bienvenido! Completá tu perfil" : "Mi perfil"}
        </h1>
        <p className="mt-1 text-sm text-muted">
          {welcome
            ? "Cargá tus datos para que te avisemos de los torneos que te sirven. Podés completarlo ahora o más tarde."
            : "Editá tus datos de jugador y seguí tu rendimiento."}
        </p>
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-ink">Datos de jugador</h2>
        </CardHeader>
        <CardContent>
          {player ? (
            <ProfileForm
              userId={user.id}
              email={email}
              fullName={player.full_name}
              firstName={player.first_name}
              birthdate={player.birthdate}
              gender={player.gender as Enums<"gender"> | null}
              category={player.category}
              hand={player.hand}
              homeClubId={player.home_club_id}
              clubOther={clubOther}
              photoUrl={player.photo_url}
              notifyEnabled={player.notify_enabled}
              notifyMixto={player.notify_mixto}
              notifyInapp={player.notify_inapp}
              notifyEmail={player.notify_email}
              notifyTelegram={player.notify_telegram}
              notifyWhatsapp={player.notify_whatsapp}
              clubs={clubs}
            />
          ) : (
            <p className="text-sm text-muted">
              No pudimos cargar tu ficha de jugador. Recargá la página.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-ink">Mi seguimiento</h2>
            {player && (
              <span className="text-sm text-muted">
                ELO global:{" "}
                <span className="font-bold text-padel-600">
                  {player.elo_rating}
                </span>
              </span>
            )}
          </div>
          {clubContribution && (
            <p className="mt-1 text-sm text-muted">
              Puntos que sumaste para {clubContribution.clubName}:{" "}
              <span className="font-bold text-padel-600">
                {clubContribution.points} pts
              </span>
            </p>
          )}
        </CardHeader>
        <CardContent>
          {standings.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">
              Todavía no participaste en ningún torneo. Cuando juegues, vas a ver
              tu posición y puntos por torneo acá.
            </p>
          ) : (
            <div className="space-y-2">
              {standings.map((s) => {
                const meta = s.event
                  ? formatModalityCategory({
                      modality: s.event.modality,
                      category_system: s.event.category_system,
                      category_value: s.event.category_value,
                    })
                  : null;
                return (
                  <div
                    key={s.id}
                    className="flex items-center gap-3 rounded-xl border border-border-soft bg-surface px-4 py-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-ink">
                        {s.event?.name ?? "Torneo"}
                      </p>
                      <p className="text-xs text-muted">
                        {meta ? `${meta} · ` : ""}
                        {s.played} jugados · {s.won}G {s.lost}P
                      </p>
                    </div>
                    {s.position != null && (
                      <Badge tone="neutral">#{s.position}</Badge>
                    )}
                    <span className="text-sm font-bold text-padel-600">
                      {s.points} pts
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
