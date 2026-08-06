import type { createClient } from "@/lib/supabase/server";
import type { Enums, Tables, TablesUpdate } from "@/lib/database.types";

/** Cliente Supabase server-side (RLS aplica sobre él). */
type DB = Awaited<ReturnType<typeof createClient>>;

/* ---- Datos del club (Ajustes) ---- */

export type ClubInfo = Pick<
  Tables<"clubs">,
  | "id"
  | "name"
  | "city"
  | "address"
  | "phone"
  | "contact_email"
  | "description"
  | "instagram"
  | "website"
  | "logo_url"
>;

/** Datos del club para Ajustes. */
export async function getClubInfo(
  supabase: DB,
  clubId: string
): Promise<ClubInfo | null> {
  const { data } = await supabase
    .from("clubs")
    .select(
      "id, name, city, address, phone, contact_email, description, instagram, website, logo_url"
    )
    .eq("id", clubId)
    .maybeSingle();
  return (data as ClubInfo) ?? null;
}

/** Actualiza los datos del club. */
export async function updateClubInfo(
  supabase: DB,
  clubId: string,
  patch: TablesUpdate<"clubs">
): Promise<{ error: boolean }> {
  const { error } = await supabase.from("clubs").update(patch).eq("id", clubId);
  return { error: Boolean(error) };
}

/* ---- Canchas (courts) ---- */

export type ClubCourt = Pick<
  Tables<"courts">,
  | "id"
  | "name"
  | "is_active"
  | "number"
  | "enclosure_type"
  | "surface"
  | "covered"
  | "lighting"
  | "panoramic"
  | "price_per_slot"
  | "slot_minutes"
  | "operating_days"
  | "open_hour"
  | "close_hour"
>;

/** Canchas del club (config completa) para Ajustes. */
export async function listClubCourts(
  supabase: DB,
  clubId: string
): Promise<ClubCourt[]> {
  const { data } = await supabase
    .from("courts")
    .select(
      "id, name, is_active, number, enclosure_type, surface, covered, lighting, panoramic, price_per_slot, slot_minutes, operating_days, open_hour, close_hour"
    )
    .eq("club_id", clubId)
    .order("name", { ascending: true });
  return (data ?? []) as ClubCourt[];
}

/** Cantidad de canchas del club (para el onboarding). */
export async function countClubCourts(
  supabase: DB,
  clubId: string
): Promise<number> {
  const { count } = await supabase
    .from("courts")
    .select("id", { count: "exact", head: true })
    .eq("club_id", clubId);
  return count ?? 0;
}

/** Número de cancha más alto del club (para autoasignar el siguiente). */
export async function getMaxCourtNumber(
  supabase: DB,
  clubId: string
): Promise<number> {
  const { data } = await supabase
    .from("courts")
    .select("number")
    .eq("club_id", clubId)
    .order("number", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();
  return data?.number ?? 0;
}

/** Crea una cancha con número autoasignado. */
export async function insertCourt(
  supabase: DB,
  clubId: string,
  name: string,
  number: number
): Promise<{ error: boolean }> {
  const { error } = await supabase
    .from("courts")
    .insert({ club_id: clubId, name, number });
  return { error: Boolean(error) };
}

/** Renombra una cancha del club. */
export async function renameCourtRow(
  supabase: DB,
  id: string,
  clubId: string,
  name: string
): Promise<{ error: boolean }> {
  const { error } = await supabase
    .from("courts")
    .update({ name })
    .eq("id", id)
    .eq("club_id", clubId);
  return { error: Boolean(error) };
}

/** Activa/desactiva una cancha. */
export async function setCourtActive(
  supabase: DB,
  id: string,
  clubId: string,
  isActive: boolean
): Promise<{ error: boolean }> {
  const { error } = await supabase
    .from("courts")
    .update({ is_active: isActive })
    .eq("id", id)
    .eq("club_id", clubId);
  return { error: Boolean(error) };
}

/** Guarda la configuración completa de una cancha. */
export async function updateCourtConfigRow(
  supabase: DB,
  id: string,
  clubId: string,
  patch: TablesUpdate<"courts">
): Promise<{ error: boolean }> {
  const { error } = await supabase
    .from("courts")
    .update(patch)
    .eq("id", id)
    .eq("club_id", clubId);
  return { error: Boolean(error) };
}

/* ---- Motor de ocupación (club_occupancy) ---- */

export type OccupancyConfigRow = Pick<
  Tables<"club_occupancy">,
  | "enabled"
  | "wa_target"
  | "discount_pct"
  | "lead_minutes"
  | "segment_enabled"
  | "segment_discount_pct"
  | "segment_min_matches"
  | "segment_inactive_days"
  | "segment_max_per_run"
>;

/** Config del motor de ocupación del club. */
export async function getClubOccupancy(
  supabase: DB,
  clubId: string
): Promise<OccupancyConfigRow | null> {
  const { data } = await supabase
    .from("club_occupancy")
    .select(
      "enabled, wa_target, discount_pct, lead_minutes, segment_enabled, segment_discount_pct, segment_min_matches, segment_inactive_days, segment_max_per_run"
    )
    .eq("club_id", clubId)
    .maybeSingle();
  return (data as OccupancyConfigRow) ?? null;
}

export type OccupancyConfigInput = {
  enabled: boolean;
  wa_target: string | null;
  discount_pct: number;
  lead_minutes: number;
  segment_enabled: boolean;
  segment_discount_pct: number;
  segment_min_matches: number;
  segment_inactive_days: number;
  segment_max_per_run: number;
};

/** Guarda (upsert) la config del motor de ocupación. */
export async function upsertClubOccupancy(
  supabase: DB,
  clubId: string,
  config: OccupancyConfigInput
): Promise<{ error: boolean }> {
  const { error } = await supabase
    .from("club_occupancy")
    .upsert(
      { club_id: clubId, ...config, updated_at: new Date().toISOString() },
      { onConflict: "club_id" }
    );
  return { error: Boolean(error) };
}

/** ¿El usuario es miembro de algún club? (define el destino tras login). */
export async function isClubMember(
  supabase: DB,
  userId: string
): Promise<boolean> {
  const { data } = await supabase
    .from("club_members")
    .select("id")
    .eq("profile_id", userId)
    .limit(1)
    .maybeSingle();
  return Boolean(data);
}

/* ---- Miembros del club ---- */

/** Miembros del club (RPC con los datos del perfil). */
export async function listClubMembers(
  supabase: DB,
  clubId: string
): Promise<unknown[]> {
  const { data } = await supabase.rpc("list_club_members", {
    p_club_id: clubId,
  });
  return (data ?? []) as unknown[];
}

export type AddMemberOutcome = "ok" | "not_found" | "error";

/** Agrega un miembro por email (RPC). `not_found` = no existe esa cuenta. */
export async function addClubMember(
  supabase: DB,
  clubId: string,
  email: string,
  role: Enums<"club_member_role">
): Promise<AddMemberOutcome> {
  const { data, error } = await supabase.rpc("add_club_member", {
    p_club_id: clubId,
    p_email: email,
    p_role: role,
  });
  if (error) return "error";
  if (data === "not_found") return "not_found";
  return "ok";
}

/** Cambia el rol de un miembro del club. */
export async function updateMemberRole(
  supabase: DB,
  clubId: string,
  profileId: string,
  role: Enums<"club_member_role">
): Promise<{ error: boolean }> {
  const { error } = await supabase
    .from("club_members")
    .update({ role })
    .eq("club_id", clubId)
    .eq("profile_id", profileId);
  return { error: Boolean(error) };
}

/** Quita un miembro del club. */
export async function removeClubMember(
  supabase: DB,
  clubId: string,
  profileId: string
): Promise<{ error: boolean }> {
  const { error } = await supabase
    .from("club_members")
    .delete()
    .eq("club_id", clubId)
    .eq("profile_id", profileId);
  return { error: Boolean(error) };
}

/** Otros clubes (todos menos el dado) — ej. para elegir rival de interclub. */
export async function listOtherClubs(
  supabase: DB,
  excludeClubId: string
): Promise<{ id: string; name: string }[]> {
  const { data } = await supabase
    .from("clubs")
    .select("id, name")
    .neq("id", excludeClubId)
    .order("name", { ascending: true });
  return (data ?? []) as { id: string; name: string }[];
}

/* ---- Operadores (comerciales que operan clubes ajenos) ---- */

/** Solicitudes de operador pendientes del club (RPC). */
export async function listPendingOperatorRequests(
  supabase: DB,
  clubId: string
): Promise<unknown[]> {
  const { data } = await supabase.rpc("club_operator_pending", {
    p_club_id: clubId,
  });
  return (data ?? []) as unknown[];
}

type RpcOutcome = { ok: boolean; error?: string } | null;

/** El comercial pide operar un club (queda pendiente de aprobación). */
export async function requestOperatorAccess(
  supabase: DB,
  clubId: string
): Promise<{ ok: boolean; error?: string }> {
  const { data, error } = await supabase.rpc("operator_request_club", {
    p_club_id: clubId,
  });
  const res = data as RpcOutcome;
  if (error || !res?.ok) {
    return { ok: false, error: res?.error };
  }
  return { ok: true };
}

/** El admin del club aprueba/rechaza una solicitud de operador. */
export async function decideOperatorRequest(
  supabase: DB,
  requestId: string,
  accept: boolean
): Promise<{ ok: boolean; error?: string }> {
  const { data, error } = await supabase.rpc("operator_decide", {
    p_request_id: requestId,
    p_accept: accept,
  });
  const res = data as RpcOutcome;
  if (error || !res?.ok) {
    return { ok: false, error: res?.error };
  }
  return { ok: true };
}

/* ---- Administración de clubes (superadmin) ---- */

export type ClubOverviewRow = {
  id: string;
  name: string;
  city: string | null;
  admins: number;
  is_active: boolean;
  /** Tiene eventos o reservas → no se puede eliminar, sólo desactivar. */
  has_data: boolean;
  plan_id: string | null;
};

export type ClubLeadRow = {
  id: string;
  name: string;
  mention_count: number;
};

/** Clubes con su cantidad de miembros y si ya tienen datos (eventos/reservas). */
export async function listClubsOverview(
  supabase: DB
): Promise<ClubOverviewRow[]> {
  const [
    { data: clubs },
    { data: members },
    { data: events },
    { data: bookings },
  ] = await Promise.all([
    supabase.from("clubs").select("id, name, city, is_active, plan_id").order("created_at"),
    supabase.from("club_members").select("club_id"),
    supabase.from("events").select("club_id"),
    supabase.from("court_bookings").select("club_id"),
  ]);

  const counts = new Map<string, number>();
  for (const m of members ?? []) {
    counts.set(m.club_id, (counts.get(m.club_id) ?? 0) + 1);
  }
  const withData = new Set<string>();
  for (const e of events ?? []) withData.add(e.club_id);
  for (const b of bookings ?? []) withData.add(b.club_id);

  return (clubs ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    city: c.city,
    admins: counts.get(c.id) ?? 0,
    is_active: c.is_active,
    has_data: withData.has(c.id),
    plan_id: c.plan_id,
  }));
}

/** Asigna (o quita, con null) el plan de un club. Solo superadmin (RLS/roles). */
export async function setClubPlanId(
  supabase: DB,
  clubId: string,
  planId: string | null
): Promise<{ error: boolean }> {
  const { error } = await supabase
    .from("clubs")
    .update({ plan_id: planId, updated_at: new Date().toISOString() })
    .eq("id", clubId);
  return { error: Boolean(error) };
}

/** Clubes-lead sin convertir, priorizados por menciones de jugadores (CRM). */
export async function listOpenClubLeads(
  supabase: DB,
  limit = 100
): Promise<ClubLeadRow[]> {
  const { data } = await supabase
    .from("club_leads")
    .select("id, name, mention_count")
    .is("converted_club_id", null)
    .order("mention_count", { ascending: false })
    .limit(limit);
  return (data ?? []) as ClubLeadRow[];
}

export type ProspectLead = {
  id: string;
  name: string;
  mention_count: number;
  converted_club_id: string | null;
  updated_at: string;
};

/** Clubes-lead sin convertir para la pantalla de Prospectos (CRM). */
export async function listProspectLeads(
  supabase: DB,
  limit = 100
): Promise<ProspectLead[]> {
  const { data } = await supabase
    .from("club_leads")
    .select("id, name, mention_count, converted_club_id, updated_at")
    .is("converted_club_id", null)
    .order("mention_count", { ascending: false })
    .limit(limit);
  return (data ?? []) as ProspectLead[];
}

export type CreateClubOutcome =
  | { ok: true; adminStatus: string }
  | { ok: false; unauthorized: boolean };

/** Crea un club (la RPC valida que sea superadmin). */
export async function adminCreateClub(
  supabase: DB,
  input: {
    name: string;
    city?: string;
    adminEmail?: string;
    leadId?: string;
  }
): Promise<CreateClubOutcome> {
  const { data, error } = await supabase.rpc("admin_create_club", {
    p_name: input.name,
    p_city: input.city || undefined,
    p_admin_email: input.adminEmail || undefined,
    p_lead_id: input.leadId ?? undefined,
  });
  if (error) {
    return { ok: false, unauthorized: error.message.includes("no autorizado") };
  }
  const adminStatus =
    (data as { admin_status?: string } | null)?.admin_status ?? "sin_admin";
  return { ok: true, adminStatus };
}

/** Activa o desactiva (archiva) un club. */
export async function setClubActiveFlag(
  supabase: DB,
  clubId: string,
  active: boolean
): Promise<{ error: boolean }> {
  const { error } = await supabase
    .from("clubs")
    .update({ is_active: active, updated_at: new Date().toISOString() })
    .eq("id", clubId);
  return { error: Boolean(error) };
}

export type DeleteClubOutcome = "ok" | "forbidden" | "has_data" | "error";

/** Elimina un club. Bloquea si tiene eventos o reservas. */
export async function adminDeleteClub(
  supabase: DB,
  clubId: string
): Promise<DeleteClubOutcome> {
  const { data, error } = await supabase.rpc("admin_delete_club", {
    p_club_id: clubId,
  });
  if (error) return "error";
  if (data === "forbidden") return "forbidden";
  if (data === "has_data") return "has_data";
  return "ok";
}

export type OperableClub = {
  id: string;
  name: string;
  city: string | null;
  /** Estado de la solicitud del usuario para ese club (null = nunca pidió). */
  status: string | null;
};

/**
 * Clubes que el usuario puede pedir operar: activos, de los que todavía NO es
 * miembro, con el estado de su solicitud si ya la hizo.
 */
export async function listOperableClubs(
  supabase: DB,
  userId: string
): Promise<OperableClub[]> {
  const [{ data: clubs }, { data: myMemberships }, { data: myRequests }] =
    await Promise.all([
      supabase
        .from("clubs")
        .select("id, name, city")
        .eq("is_active", true)
        .order("name"),
      supabase.from("club_members").select("club_id").eq("profile_id", userId),
      supabase
        .from("club_operator_requests")
        .select("club_id, status")
        .eq("operator_profile_id", userId),
    ]);

  const memberOf = new Set((myMemberships ?? []).map((m) => m.club_id));
  const reqStatus = new Map(
    (myRequests ?? []).map((r) => [r.club_id, r.status as string])
  );

  return (clubs ?? [])
    .filter((c) => !memberOf.has(c.id))
    .map((c) => ({
      id: c.id,
      name: c.name,
      city: c.city,
      status: reqStatus.get(c.id) ?? null,
    }));
}
