import type { createClient } from "@/lib/supabase/server";

type DB = Awaited<ReturnType<typeof createClient>>;

export type ClubKpis = {
  recaudadoMes: number;
  porCobrarMes: number;
  reservasMes: number;
  clientesMes: number;
  nuevosMes: number;
  clasesMes: number;
};

/** Indicadores del mes para el tablero de Inicio (rango [from, to] YYYY-MM-DD). */
export async function getClubKpis(
  supabase: DB,
  clubId: string,
  from: string,
  to: string
): Promise<ClubKpis> {
  const [bkRes, lessonsRes, groupsRes, nuevosRes] = await Promise.all([
    supabase
      .from("court_bookings")
      .select("price, amount_charged, paid_at, status, kind, customer_phone")
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
  ]);

  // Reservas reales (excluye bloqueos y turnos de torneo).
  const bookings = (bkRes.data ?? []).filter(
    (b) => b.kind !== "tournament" && b.status !== "blocked"
  );
  let recaudado = 0;
  let porCobrar = 0;
  const clientes = new Set<string>();
  for (const b of bookings) {
    const cobrado = Number(b.amount_charged ?? b.price ?? 0);
    if (b.paid_at) recaudado += cobrado;
    else if (b.status === "reserved" || b.status === "held")
      porCobrar += Number(b.price ?? 0);
    if (b.customer_phone) clientes.add(b.customer_phone);
  }

  return {
    recaudadoMes: Math.round(recaudado),
    porCobrarMes: Math.round(porCobrar),
    reservasMes: bookings.length,
    clientesMes: clientes.size,
    nuevosMes: nuevosRes.count ?? 0,
    clasesMes: (lessonsRes.count ?? 0) + (groupsRes.count ?? 0),
  };
}
