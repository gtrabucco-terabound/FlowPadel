import type { createClient } from "@/lib/supabase/server";

type DB = Awaited<ReturnType<typeof createClient>>;

/** Cuenta los días del rango [from, to] cuyo día de semana está en `days` (1=Lun..7=Dom). */
function countOperatingDays(from: string, to: string, days: number[]): number {
  if (from > to) return 0;
  const start = new Date(`${from}T12:00:00Z`);
  const end = new Date(`${to}T12:00:00Z`);
  let n = 0;
  for (let d = start; d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    const js = d.getUTCDay();
    const iso = js === 0 ? 7 : js;
    if (days.includes(iso)) n++;
  }
  return n;
}

export type CourtBoard = {
  courtsActivos: number;
  ocupacionPct: number;
};

/**
 * Ocupación de canchas del mes hasta hoy: turnos usados ÷ turnos disponibles.
 * Disponibles = por cada cancha activa, slots/día × días que opera en el rango.
 */
export async function getCourtOccupancy(
  supabase: DB,
  clubId: string,
  from: string,
  today: string
): Promise<CourtBoard> {
  const [courtsRes, bookingsRes] = await Promise.all([
    supabase
      .from("courts")
      .select("open_hour, close_hour, slot_minutes, operating_days")
      .eq("club_id", clubId)
      .eq("is_active", true),
    supabase
      .from("court_bookings")
      .select("id", { count: "exact", head: true })
      .eq("club_id", clubId)
      .gte("booking_date", from)
      .lte("booking_date", today)
      .in("status", ["reserved", "held"]),
  ]);

  const courts = courtsRes.data ?? [];
  let disponibles = 0;
  for (const c of courts) {
    const step = c.slot_minutes || 90;
    const slotsPerDay = Math.max(
      0,
      Math.floor(((c.close_hour - c.open_hour) * 60) / step)
    );
    const days = c.operating_days?.length ? c.operating_days : [1, 2, 3, 4, 5, 6, 7];
    disponibles += slotsPerDay * countOperatingDays(from, today, days);
  }

  const ocupados = bookingsRes.count ?? 0;
  const pct = disponibles > 0 ? Math.round((ocupados / disponibles) * 100) : 0;
  return { courtsActivos: courts.length, ocupacionPct: pct };
}

export type TopPlayer = {
  id: string;
  full_name: string;
  photo_url: string | null;
  elo_rating: number;
};

/** Jugadores del club ordenados por ranking (ELO), para el podio de Inicio. */
export async function listTopPlayers(
  supabase: DB,
  clubId: string,
  limit = 3
): Promise<TopPlayer[]> {
  const { data } = await supabase
    .from("players")
    .select("id, full_name, photo_url, elo_rating")
    .eq("home_club_id", clubId)
    .order("elo_rating", { ascending: false })
    .limit(limit);
  return (data ?? []) as TopPlayer[];
}

export type UpcomingEvent = {
  id: string;
  name: string;
  start_date: string | null;
  event_type: string;
};

/** Próximos eventos (no borrador) del club, de hoy en adelante. */
export async function listUpcomingEvents(
  supabase: DB,
  clubId: string,
  today: string,
  limit = 5
): Promise<UpcomingEvent[]> {
  const { data } = await supabase
    .from("events")
    .select("id, name, start_date, event_type")
    .eq("club_id", clubId)
    .neq("status", "draft")
    .gte("start_date", today)
    .order("start_date", { ascending: true })
    .limit(limit);
  return (data ?? []) as UpcomingEvent[];
}

export type ClubKpis = {
  recaudadoMes: number;
  porCobrarMes: number;
  reservasMes: number;
  reservasBotMes: number;
  clientesMes: number;
  nuevosMes: number;
  clasesMes: number;
  invitacionesMes: number;
};

/** Indicadores del mes para el tablero de Inicio (rango [from, to] YYYY-MM-DD). */
export async function getClubKpis(
  supabase: DB,
  clubId: string,
  from: string,
  to: string
): Promise<ClubKpis> {
  const [bkRes, lessonsRes, groupsRes, nuevosRes, invitesRes, offerInvitesRes] =
    await Promise.all([
    supabase
      .from("court_bookings")
      .select("price, amount_charged, paid_at, status, kind, customer_phone, source")
      .eq("club_id", clubId)
      .gte("booking_date", from)
      .lte("booking_date", to)
      .neq("status", "cancelled"),
    supabase
      .from("lessons")
      .select("id", { count: "exact", head: true })
      .eq("club_id", clubId)
      .neq("status", "cancelled")
      .gte("lesson_date", from)
      .lte("lesson_date", to),
    supabase
      .from("group_sessions")
      .select("id", { count: "exact", head: true })
      .eq("club_id", clubId)
      .neq("status", "cancelled")
      .gte("session_date", from)
      .lte("session_date", to),
    supabase
      .from("players")
      .select("id", { count: "exact", head: true })
      .eq("home_club_id", clubId)
      .gte("created_at", from),
    // Invitaciones a torneos gestionadas en el mes (motor de invitaciones).
    supabase
      .from("tournament_invites")
      .select("id, events!inner(club_id)", { count: "exact", head: true })
      .eq("events.club_id", clubId)
      .gte("created_at", from)
      .lte("created_at", `${to}T23:59:59`),
    // Invitaciones de oferta del motor de ocupación (canal segmentado).
    supabase
      .from("player_offer_invites")
      .select("id", { count: "exact", head: true })
      .eq("club_id", clubId)
      .gte("invite_date", from)
      .lte("invite_date", to),
  ]);

  // Reservas reales (excluye bloqueos y turnos de torneo).
  const bookings = (bkRes.data ?? []).filter(
    (b) => b.kind !== "tournament" && b.status !== "blocked"
  );
  let recaudado = 0;
  let porCobrar = 0;
  let reservasBot = 0;
  const clientes = new Set<string>();
  for (const b of bookings) {
    const cobrado = Number(b.amount_charged ?? b.price ?? 0);
    if (b.paid_at) recaudado += cobrado;
    else if (b.status === "reserved" || b.status === "held")
      porCobrar += Number(b.price ?? 0);
    if (b.customer_phone) clientes.add(b.customer_phone);
    if (b.source === "bot") reservasBot += 1;
  }

  return {
    recaudadoMes: Math.round(recaudado),
    porCobrarMes: Math.round(porCobrar),
    reservasMes: bookings.length,
    reservasBotMes: reservasBot,
    clientesMes: clientes.size,
    nuevosMes: nuevosRes.count ?? 0,
    clasesMes: (lessonsRes.count ?? 0) + (groupsRes.count ?? 0),
    invitacionesMes: (invitesRes.count ?? 0) + (offerInvitesRes.count ?? 0),
  };
}
