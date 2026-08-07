import type { createClient } from "@/lib/supabase/server";
import type { Tables, TablesInsert } from "@/lib/database.types";

/** Cliente Supabase server-side (RLS aplica sobre él). */
type DB = Awaited<ReturnType<typeof createClient>>;

export type Coach = Tables<"coaches">;
export type CoachAvailability = Tables<"coach_availability">;
export type Lesson = Tables<"lessons">;

/* ---- Profesores ---- */

export async function listClubCoaches(
  supabase: DB,
  clubId: string
): Promise<Coach[]> {
  const { data } = await supabase
    .from("coaches")
    .select("*")
    .eq("club_id", clubId)
    .order("name", { ascending: true });
  return (data ?? []) as Coach[];
}

export async function insertCoach(
  supabase: DB,
  clubId: string,
  input: { name: string; phone: string | null; email: string | null }
): Promise<{ error: boolean }> {
  const { error } = await supabase
    .from("coaches")
    .insert({ club_id: clubId, ...input });
  return { error: Boolean(error) };
}

export async function updateCoach(
  supabase: DB,
  id: string,
  clubId: string,
  patch: { name?: string; phone?: string | null; email?: string | null; active?: boolean }
): Promise<{ error: boolean }> {
  const { error } = await supabase
    .from("coaches")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("club_id", clubId);
  return { error: Boolean(error) };
}

export async function deleteCoach(
  supabase: DB,
  id: string,
  clubId: string
): Promise<{ error: boolean }> {
  const { error } = await supabase
    .from("coaches")
    .delete()
    .eq("id", id)
    .eq("club_id", clubId);
  return { error: Boolean(error) };
}

/* ---- Disponibilidad ---- */

export async function listAvailability(
  supabase: DB,
  clubId: string
): Promise<CoachAvailability[]> {
  // Disponibilidad de todos los profes activos del club (join implícito por RLS).
  const { data: coaches } = await supabase
    .from("coaches")
    .select("id")
    .eq("club_id", clubId);
  const ids = (coaches ?? []).map((c) => c.id);
  if (ids.length === 0) return [];
  const { data } = await supabase
    .from("coach_availability")
    .select("*")
    .in("coach_id", ids)
    .order("weekday", { ascending: true });
  return (data ?? []) as CoachAvailability[];
}

/* ---- Reporte por profesor (calendario + disponibilidad + KPIs) ---- */

export type CoachUpcoming = {
  kind: "clase" | "grupo";
  date: string;
  start: number;
};

export type CoachReport = {
  coach: Coach;
  clasesMes: number;
  gruposMes: number;
  alumnosMes: number;
  ingresoMes: number;
  weekdays: number[];
  proximas: CoachUpcoming[];
};

/**
 * Arma el reporte de cada profe del club: clases/grupos del mes, alumnos
 * distintos, ingreso estimado de clases individuales, días de disponibilidad y
 * sus próximas actividades. Rango [from, to] en YYYY-MM-DD; `today` = hoy.
 */
export async function getCoachesReport(
  supabase: DB,
  clubId: string,
  from: string,
  to: string,
  today: string
): Promise<CoachReport[]> {
  const coaches = await listClubCoaches(supabase, clubId);
  if (coaches.length === 0) return [];
  const ids = coaches.map((c) => c.id);

  const [lessonsRes, groupsRes, availRes] = await Promise.all([
    supabase
      .from("lessons")
      .select("coach_id, lesson_date, start_minutes, price, player_id, customer_name, status")
      .in("coach_id", ids)
      .neq("status", "cancelled")
      .gte("lesson_date", from)
      .lte("lesson_date", to),
    supabase
      .from("group_sessions")
      .select("coach_id, session_date, start_minutes, status")
      .in("coach_id", ids)
      .neq("status", "cancelled")
      .gte("session_date", from)
      .lte("session_date", to),
    supabase
      .from("coach_availability")
      .select("coach_id, weekday")
      .in("coach_id", ids),
  ]);

  const lessons = lessonsRes.data ?? [];
  const groups = groupsRes.data ?? [];
  const avail = availRes.data ?? [];

  return coaches.map((coach) => {
    const myLessons = lessons.filter((l) => l.coach_id === coach.id);
    const myGroups = groups.filter((g) => g.coach_id === coach.id);

    const alumnos = new Set<string>();
    let ingreso = 0;
    for (const l of myLessons) {
      ingreso += Number(l.price ?? 0);
      const who = l.player_id ?? l.customer_name;
      if (who) alumnos.add(who);
    }

    const weekdays = Array.from(
      new Set(avail.filter((a) => a.coach_id === coach.id).map((a) => a.weekday))
    ).sort((a, b) => a - b);

    const proximas: CoachUpcoming[] = [
      ...myLessons
        .filter((l) => l.lesson_date >= today)
        .map((l) => ({ kind: "clase" as const, date: l.lesson_date, start: l.start_minutes })),
      ...myGroups
        .filter((g) => g.session_date >= today)
        .map((g) => ({ kind: "grupo" as const, date: g.session_date, start: g.start_minutes })),
    ]
      .sort((a, b) => (a.date === b.date ? a.start - b.start : a.date < b.date ? -1 : 1))
      .slice(0, 4);

    return {
      coach,
      clasesMes: myLessons.length,
      gruposMes: myGroups.length,
      alumnosMes: alumnos.size,
      ingresoMes: Math.round(ingreso),
      weekdays,
      proximas,
    };
  });
}

/** ¿Ya existe una franja del profe ese día que se pise con [start,end)? */
export async function availabilityOverlaps(
  supabase: DB,
  coachId: string,
  weekday: number,
  startMinutes: number,
  endMinutes: number
): Promise<boolean> {
  const { data } = await supabase
    .from("coach_availability")
    .select("start_minutes, end_minutes")
    .eq("coach_id", coachId)
    .eq("weekday", weekday);
  return (data ?? []).some(
    (a) => startMinutes < a.end_minutes && a.start_minutes < endMinutes
  );
}

export async function addAvailability(
  supabase: DB,
  input: { coach_id: string; weekday: number; start_minutes: number; end_minutes: number }
): Promise<{ error: boolean }> {
  const { error } = await supabase.from("coach_availability").insert(input);
  return { error: Boolean(error) };
}

export async function deleteAvailability(
  supabase: DB,
  id: string
): Promise<{ error: boolean }> {
  const { error } = await supabase.from("coach_availability").delete().eq("id", id);
  return { error: Boolean(error) };
}

/* ---- Clases ---- */

export type LessonWithNames = Lesson & {
  coach: { name: string } | null;
  court: { name: string; number: number | null } | null;
};

/** Próximas clases del club (desde hoy), con nombre de profe y cancha. */
export async function listUpcomingLessons(
  supabase: DB,
  clubId: string,
  fromDate: string
): Promise<LessonWithNames[]> {
  const { data } = await supabase
    .from("lessons")
    .select("*, coach:coaches(name), court:courts(name, number)")
    .eq("club_id", clubId)
    .neq("status", "cancelled")
    .gte("lesson_date", fromDate)
    .order("lesson_date", { ascending: true })
    .order("start_minutes", { ascending: true });
  return (data ?? []) as unknown as LessonWithNames[];
}

export async function insertLesson(
  supabase: DB,
  row: TablesInsert<"lessons">
): Promise<string | null> {
  const { data, error } = await supabase
    .from("lessons")
    .insert(row)
    .select("id")
    .single();
  if (error || !data) return null;
  return data.id;
}

/** Vincula la clase con la reserva de cancha que la bloquea. */
export async function setLessonBooking(
  supabase: DB,
  lessonId: string,
  clubId: string,
  bookingId: string
): Promise<void> {
  await supabase
    .from("lessons")
    .update({ booking_id: bookingId })
    .eq("id", lessonId)
    .eq("club_id", clubId);
}

/** Devuelve el booking_id vinculado a una clase (para liberar la cancha). */
export async function getLessonBooking(
  supabase: DB,
  id: string,
  clubId: string
): Promise<string | null> {
  const { data } = await supabase
    .from("lessons")
    .select("booking_id")
    .eq("id", id)
    .eq("club_id", clubId)
    .maybeSingle();
  return data?.booking_id ?? null;
}

export async function cancelLesson(
  supabase: DB,
  id: string,
  clubId: string
): Promise<{ error: boolean }> {
  const { error } = await supabase
    .from("lessons")
    .update({ status: "cancelled" })
    .eq("id", id)
    .eq("club_id", clubId);
  return { error: Boolean(error) };
}

/* ---- Sesiones grupales (Fase 3) ---- */

export type GroupSession = Tables<"group_sessions">;
export type GroupParticipant = Tables<"group_participants">;

export type GroupSessionView = GroupSession & {
  coach: { name: string } | null;
  court: { name: string; number: number | null } | null;
  participants: GroupParticipant[];
};

/** Sesiones grupales próximas del club, con profe, cancha y participantes. */
export async function listGroupSessions(
  supabase: DB,
  clubId: string,
  fromDate: string
): Promise<GroupSessionView[]> {
  const { data } = await supabase
    .from("group_sessions")
    .select(
      "*, coach:coaches(name), court:courts(name, number), participants:group_participants(*)"
    )
    .eq("club_id", clubId)
    .neq("status", "cancelled")
    .gte("session_date", fromDate)
    .order("session_date", { ascending: true })
    .order("start_minutes", { ascending: true });
  return (data ?? []) as unknown as GroupSessionView[];
}

export async function insertGroupSession(
  supabase: DB,
  row: TablesInsert<"group_sessions">
): Promise<string | null> {
  const { data, error } = await supabase
    .from("group_sessions")
    .insert(row)
    .select("id")
    .single();
  if (error || !data) return null;
  return data.id;
}

/** Vincula la sesión grupal con la reserva de cancha que la bloquea. */
export async function setGroupSessionBooking(
  supabase: DB,
  id: string,
  clubId: string,
  bookingId: string
): Promise<void> {
  await supabase
    .from("group_sessions")
    .update({ booking_id: bookingId })
    .eq("id", id)
    .eq("club_id", clubId);
}

/** Devuelve el booking_id vinculado a una sesión grupal. */
export async function getGroupSessionBooking(
  supabase: DB,
  id: string,
  clubId: string
): Promise<string | null> {
  const { data } = await supabase
    .from("group_sessions")
    .select("booking_id")
    .eq("id", id)
    .eq("club_id", clubId)
    .maybeSingle();
  return data?.booking_id ?? null;
}

export async function setGroupSessionStatus(
  supabase: DB,
  id: string,
  clubId: string,
  status: string
): Promise<{ error: boolean }> {
  const { error } = await supabase
    .from("group_sessions")
    .update({ status })
    .eq("id", id)
    .eq("club_id", clubId);
  return { error: Boolean(error) };
}

/** Cantidad de participantes activos de una sesión. */
export async function countParticipants(
  supabase: DB,
  sessionId: string
): Promise<number> {
  const { count } = await supabase
    .from("group_participants")
    .select("id", { count: "exact", head: true })
    .eq("session_id", sessionId)
    .neq("status", "cancelled");
  return count ?? 0;
}

export async function addParticipant(
  supabase: DB,
  sessionId: string,
  name: string,
  phone: string | null
): Promise<{ error: boolean }> {
  const { error } = await supabase.from("group_participants").insert({
    session_id: sessionId,
    customer_name: name,
    customer_phone: phone,
  });
  return { error: Boolean(error) };
}

export async function removeParticipant(
  supabase: DB,
  id: string
): Promise<{ error: boolean }> {
  const { error } = await supabase
    .from("group_participants")
    .delete()
    .eq("id", id);
  return { error: Boolean(error) };
}

/** Datos de una sesión (para validar cupo al sumar participantes). */
export async function getGroupSession(
  supabase: DB,
  id: string,
  clubId: string
): Promise<Pick<GroupSession, "id" | "capacity" | "min_participants" | "status"> | null> {
  const { data } = await supabase
    .from("group_sessions")
    .select("id, capacity, min_participants, status")
    .eq("id", id)
    .eq("club_id", clubId)
    .maybeSingle();
  return data ?? null;
}
