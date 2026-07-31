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
