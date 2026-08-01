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
