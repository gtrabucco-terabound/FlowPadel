import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProfileForm } from "@/components/profile-form";
import { formatModalityCategory } from "@/lib/format";
import type { Enums } from "@/lib/database.types";
import {
  getProfileBasics,
  ensurePlayerForProfile,
  listClubsForSelect,
  getClubLeadName,
  listPlayerStandings,
} from "@/modules/players/repository";

export const dynamic = "force-dynamic";

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
  const profile = await getProfileBasics(supabase, user.id);

  const email = profile?.email ?? user.email ?? "";
  const profileName = profile?.full_name ?? user.email ?? "Jugador";

  // Ensure a player row linked to this profile exists (y sincroniza el link).
  const player = await ensurePlayerForProfile(
    supabase,
    user.id,
    profile?.player_id ?? null,
    profileName,
    email
  );

  // Clubs for the select.
  const clubs = await listClubsForSelect(supabase);

  // Nombre del club-lead (si el jugador nombró un club no registrado).
  const clubOther = player?.club_lead_id
    ? await getClubLeadName(supabase, player.club_lead_id)
    : null;

  // "Mi seguimiento": tournaments where the player has standings.
  const standings = player
    ? await listPlayerStandings(supabase, player.id)
    : [];

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
              phone={player.phone}
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
              receiveOffers={player.receive_offers}
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
