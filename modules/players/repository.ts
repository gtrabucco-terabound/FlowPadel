import type { createClient } from "@/lib/supabase/server";
import type {
  Tables,
  TablesInsert,
  TablesUpdate,
} from "@/lib/database.types";

/** Cliente Supabase server-side (RLS aplica sobre él). */
type DB = Awaited<ReturnType<typeof createClient>>;

const PLAYER_COLS =
  "id, full_name, phone, first_name, birthdate, email, gender, category, hand, home_club_id, club_lead_id, photo_url, notify_enabled, notify_mixto, notify_inapp, notify_email, notify_telegram, notify_whatsapp, receive_offers, elo_rating, matches_played, matches_won";

export type PlayerProfileRow = Pick<
  Tables<"players">,
  | "id"
  | "full_name"
  | "phone"
  | "first_name"
  | "birthdate"
  | "email"
  | "gender"
  | "category"
  | "hand"
  | "home_club_id"
  | "club_lead_id"
  | "photo_url"
  | "notify_enabled"
  | "notify_mixto"
  | "notify_inapp"
  | "notify_email"
  | "notify_telegram"
  | "notify_whatsapp"
  | "receive_offers"
  | "elo_rating"
  | "matches_played"
  | "matches_won"
>;

export type ProfileBasics = Pick<
  Tables<"profiles">,
  "id" | "email" | "full_name" | "player_id"
>;

export type StandingRow = Pick<
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

/** Perfil (auth-backed) del usuario. */
export async function getProfileBasics(
  supabase: DB,
  userId: string
): Promise<ProfileBasics | null> {
  const { data } = await supabase
    .from("profiles")
    .select("id, email, full_name, player_id")
    .eq("id", userId)
    .maybeSingle();
  return data ?? null;
}

/**
 * Devuelve la ficha de jugador del usuario, creándola si no existe, y mantiene
 * `profiles.player_id` sincronizado. La RLS garantiza que sea la propia.
 */
export async function ensurePlayerForProfile(
  supabase: DB,
  userId: string,
  profilePlayerId: string | null,
  fallbackName: string,
  email: string
): Promise<PlayerProfileRow | null> {
  const { data: existing } = await supabase
    .from("players")
    .select(PLAYER_COLS)
    .eq("profile_id", userId)
    .maybeSingle();

  if (existing) {
    if (profilePlayerId !== existing.id) {
      await supabase
        .from("profiles")
        .update({ player_id: existing.id })
        .eq("id", userId);
    }
    return existing as PlayerProfileRow;
  }

  const insert: TablesInsert<"players"> = {
    profile_id: userId,
    full_name: fallbackName,
    email,
  };
  const { data: created } = await supabase
    .from("players")
    .insert(insert)
    .select(PLAYER_COLS)
    .single();

  if (created) {
    await supabase
      .from("profiles")
      .update({ player_id: created.id })
      .eq("id", userId);
  }
  return (created as PlayerProfileRow) ?? null;
}

/** Clubes para el selector del perfil. */
export async function listClubsForSelect(
  supabase: DB
): Promise<{ id: string; name: string }[]> {
  const { data } = await supabase
    .from("clubs")
    .select("id, name")
    .order("name", { ascending: true });
  return (data ?? []) as { id: string; name: string }[];
}

/** Nombre de un club-lead (club nombrado por el jugador, no registrado). */
export async function getClubLeadName(
  supabase: DB,
  leadId: string
): Promise<string | null> {
  const { data } = await supabase
    .from("club_leads")
    .select("name")
    .eq("id", leadId)
    .maybeSingle();
  return data?.name ?? null;
}

/** Standings del jugador por torneo ("Mi seguimiento"). */
export async function listPlayerStandings(
  supabase: DB,
  playerId: string
): Promise<StandingRow[]> {
  const { data } = await supabase
    .from("player_standings")
    .select(
      "id, played, won, lost, points, position, event:events(id, name, slug, status, modality, category_system, category_value)"
    )
    .eq("player_id", playerId)
    .order("created_at", { ascending: false });
  return (data ?? []) as unknown as StandingRow[];
}

/** Nombre y teléfono del jugador (para precargar formularios). */
export async function getPlayerContact(
  supabase: DB,
  userId: string
): Promise<{ name: string; phone: string } | null> {
  const { data } = await supabase
    .from("players")
    .select("full_name, phone")
    .eq("profile_id", userId)
    .maybeSingle();
  if (!data?.full_name) return null;
  return { name: data.full_name, phone: data.phone ?? "" };
}

/** Id de la ficha de jugador del usuario (para acciones). */
export async function getPlayerIdByProfile(
  supabase: DB,
  userId: string
): Promise<string | null> {
  const { data } = await supabase
    .from("players")
    .select("id")
    .eq("profile_id", userId)
    .maybeSingle();
  return data?.id ?? null;
}

/** Registra/obtiene un club-lead por nombre (CRM encubierto). */
export async function upsertClubLead(
  supabase: DB,
  name: string
): Promise<string | null> {
  const { data } = await supabase.rpc("upsert_club_lead", { p_name: name });
  return (data as string | null) ?? null;
}

/** Actualiza la ficha del jugador (RLS restringe a la propia). */
export async function updatePlayer(
  supabase: DB,
  playerId: string,
  userId: string,
  patch: TablesUpdate<"players">
): Promise<{ error: boolean }> {
  const { error } = await supabase
    .from("players")
    .update(patch)
    .eq("id", playerId)
    .eq("profile_id", userId);
  return { error: Boolean(error) };
}
