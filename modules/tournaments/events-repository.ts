import type { createClient } from "@/lib/supabase/server";
import type { Enums, Tables, TablesInsert } from "@/lib/database.types";

/** Cliente Supabase server-side (RLS aplica sobre él). */
type DB = Awaited<ReturnType<typeof createClient>>;

/**
 * Acceso a datos de las acciones de gestión de un evento. La lógica de dominio
 * (orquestación, validaciones) sigue en app/admin/events/[id]/actions.ts; acá
 * viven solo las consultas, para sacar el `.from()`/`.rpc()` de los actions.
 */

export type EventForActions = Pick<
  Tables<"events">,
  | "id"
  | "club_id"
  | "registration_fee"
  | "currency"
  | "long_format"
  | "charge_court"
  | "inscription_per_person"
  | "court_fee_per_person"
  | "court_pool_per_person"
  | "modality"
  | "category_value"
  | "category_system"
  | "event_type"
>;

/** Verifica que el evento sea del club activo; devuelve sus datos o null. */
export async function getEventForActions(
  supabase: DB,
  eventId: string,
  clubId: string
): Promise<EventForActions | null> {
  const { data } = await supabase
    .from("events")
    .select(
      "id, club_id, registration_fee, currency, long_format, charge_court, inscription_per_person, court_fee_per_person, court_pool_per_person, modality, category_value, category_system, event_type"
    )
    .eq("id", eventId)
    .eq("club_id", clubId)
    .maybeSingle();
  return (data as EventForActions) ?? null;
}

/** Verifica que el pago sea de este evento; devuelve su id o null. */
export async function getPayment(
  supabase: DB,
  eventId: string,
  paymentId: string
): Promise<{ id: string } | null> {
  const { data } = await supabase
    .from("payments")
    .select("id")
    .eq("id", paymentId)
    .eq("event_id", eventId)
    .maybeSingle();
  return data ?? null;
}

/* ---- Inscripciones ---- */

export async function getRegistration(
  supabase: DB,
  registrationId: string,
  eventId: string
): Promise<Tables<"registrations"> | null> {
  const { data } = await supabase
    .from("registrations")
    .select("*")
    .eq("id", registrationId)
    .eq("event_id", eventId)
    .maybeSingle();
  return data ?? null;
}

export async function getPlayerGenderCategory(
  supabase: DB,
  playerId: string
): Promise<{ gender: Enums<"gender"> | null; category: number | null } | null> {
  const { data } = await supabase
    .from("players")
    .select("gender, category")
    .eq("id", playerId)
    .maybeSingle();
  return data ?? null;
}

export async function findPlayerByPhoneGC(
  supabase: DB,
  phone: string
): Promise<{
  id: string;
  gender: Enums<"gender"> | null;
  category: number | null;
} | null> {
  const { data } = await supabase
    .from("players")
    .select("id, gender, category")
    .eq("phone", phone)
    .maybeSingle();
  return data ?? null;
}

export async function patchPlayer(
  supabase: DB,
  playerId: string,
  patch: Partial<TablesInsert<"players">>
): Promise<void> {
  await supabase.from("players").update(patch).eq("id", playerId);
}

export async function insertPlayer(
  supabase: DB,
  row: TablesInsert<"players">
): Promise<string | null> {
  const { data, error } = await supabase
    .from("players")
    .insert(row)
    .select("id")
    .single();
  if (error || !data) return null;
  return data.id;
}

export async function insertTeam(
  supabase: DB,
  row: TablesInsert<"teams">
): Promise<string | null> {
  const { data, error } = await supabase
    .from("teams")
    .insert(row)
    .select("id")
    .single();
  if (error || !data) return null;
  return data.id;
}

export async function updateRegistrationApproved(
  supabase: DB,
  registrationId: string,
  patch: {
    team_id: string;
    player_1_id: string;
    player_2_id: string | null;
  }
): Promise<{ error: boolean }> {
  const { error } = await supabase
    .from("registrations")
    .update({
      status: "approved",
      team_id: patch.team_id,
      player_1_id: patch.player_1_id,
      player_2_id: patch.player_2_id,
      waitlist_position: null,
    })
    .eq("id", registrationId);
  return { error: Boolean(error) };
}

/** Notifica al jugador el cambio de estado de su inscripción (RPC). */
export async function notifyRegistrationStatus(
  supabase: DB,
  registrationId: string,
  kind: string
): Promise<void> {
  await supabase.rpc("notify_registration_status", {
    p_registration_id: registrationId,
    p_kind: kind,
  });
}

export async function listRegistrationPaymentKinds(
  supabase: DB,
  registrationId: string
): Promise<Enums<"payment_kind">[]> {
  const { data } = await supabase
    .from("payments")
    .select("id, kind")
    .eq("registration_id", registrationId);
  return (data ?? []).map((p) => p.kind as Enums<"payment_kind">);
}

export async function insertPayments(
  supabase: DB,
  rows: TablesInsert<"payments">[]
): Promise<void> {
  if (rows.length === 0) return;
  await supabase.from("payments").insert(rows);
}

/** Actualiza el estado (rechazada / lista de espera) de una inscripción. */
export async function updateRegistrationStatus(
  supabase: DB,
  registrationId: string,
  eventId: string,
  patch: {
    status: Enums<"registration_status">;
    waitlist_position: number | null;
  }
): Promise<{ error: boolean }> {
  const { error } = await supabase
    .from("registrations")
    .update(patch)
    .eq("id", registrationId)
    .eq("event_id", eventId);
  return { error: Boolean(error) };
}

/** Posición máxima actual en la lista de espera del evento. */
export async function getMaxWaitlistPosition(
  supabase: DB,
  eventId: string
): Promise<number> {
  const { data } = await supabase
    .from("registrations")
    .select("waitlist_position")
    .eq("event_id", eventId)
    .eq("status", "waitlist")
    .order("waitlist_position", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.waitlist_position ?? 0;
}
