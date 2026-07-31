"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireClubAccess } from "@/lib/admin/club";
import {
  insertCoach,
  updateCoach,
  deleteCoach,
  addAvailability,
  deleteAvailability,
  insertLesson,
  cancelLesson,
} from "@/modules/coaches/repository";
import { insertBooking } from "@/modules/reservations/repository";

type Result = { ok: true } | { ok: false; error: string };
const fail = (error: string): Result => ({ ok: false, error });

const txt = (v: FormDataEntryValue | null) => {
  const s = String(v ?? "").trim();
  return s === "" ? null : s;
};
const num = (v: FormDataEntryValue | null) => {
  const s = String(v ?? "").trim();
  const n = Number(s);
  return s !== "" && Number.isFinite(n) ? n : null;
};

function refresh() {
  revalidatePath("/admin/clases");
  revalidatePath("/admin/agenda");
}

/* ---- Profesores ---- */

export async function createCoach(formData: FormData): Promise<Result> {
  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 2) return fail("Ingresá el nombre del profe.");
  const { clubId } = await requireClubAccess();
  const supabase = await createClient();
  const { error } = await insertCoach(supabase, clubId, {
    name,
    phone: txt(formData.get("phone")),
    email: txt(formData.get("email")),
  });
  if (error) return fail("No pudimos agregar al profe.");
  refresh();
  return { ok: true };
}

export async function toggleCoach(id: string, active: boolean): Promise<Result> {
  const { clubId } = await requireClubAccess();
  const supabase = await createClient();
  const { error } = await updateCoach(supabase, id, clubId, { active });
  if (error) return fail("No pudimos actualizar al profe.");
  refresh();
  return { ok: true };
}

export async function removeCoach(id: string): Promise<Result> {
  const { clubId } = await requireClubAccess();
  const supabase = await createClient();
  const { error } = await deleteCoach(supabase, id, clubId);
  if (error) return fail("No pudimos eliminar al profe.");
  refresh();
  return { ok: true };
}

/* ---- Disponibilidad ---- */

const availSchema = z.object({
  coach_id: z.string().min(1),
  weekday: z.coerce.number().int().min(1).max(7),
  from_hour: z.coerce.number().int().min(0).max(23),
  to_hour: z.coerce.number().int().min(1).max(24),
});

export async function createAvailability(formData: FormData): Promise<Result> {
  const parsed = availSchema.safeParse({
    coach_id: formData.get("coach_id"),
    weekday: formData.get("weekday"),
    from_hour: formData.get("from_hour"),
    to_hour: formData.get("to_hour"),
  });
  if (!parsed.success) return fail("Datos de disponibilidad inválidos.");
  if (parsed.data.to_hour <= parsed.data.from_hour)
    return fail("La hora de fin debe ser posterior a la de inicio.");

  await requireClubAccess();
  const supabase = await createClient();
  const { error } = await addAvailability(supabase, {
    coach_id: parsed.data.coach_id,
    weekday: parsed.data.weekday,
    start_minutes: parsed.data.from_hour * 60,
    end_minutes: parsed.data.to_hour * 60,
  });
  if (error) return fail("No pudimos guardar la disponibilidad.");
  refresh();
  return { ok: true };
}

export async function removeAvailability(id: string): Promise<Result> {
  await requireClubAccess();
  const supabase = await createClient();
  const { error } = await deleteAvailability(supabase, id);
  if (error) return fail("No pudimos borrar la disponibilidad.");
  refresh();
  return { ok: true };
}

/* ---- Clases ---- */

export async function scheduleLesson(formData: FormData): Promise<Result> {
  const coachId = String(formData.get("coach_id") ?? "");
  const date = String(formData.get("lesson_date") ?? "");
  const startMin = num(formData.get("start_minutes"));
  const slotMin = num(formData.get("slot_minutes")) ?? 90;
  const courtId = txt(formData.get("court_id"));
  const name = String(formData.get("customer_name") ?? "").trim();
  const phone = txt(formData.get("customer_phone"));
  const price = num(formData.get("price"));

  if (!coachId) return fail("Elegí un profe.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return fail("Fecha inválida.");
  if (startMin == null || startMin < 0) return fail("Elegí un horario.");
  if (name.length < 2) return fail("Ingresá el nombre del alumno.");

  const { clubId } = await requireClubAccess();
  const supabase = await createClient();

  const lessonId = await insertLesson(supabase, {
    club_id: clubId,
    coach_id: coachId,
    court_id: courtId,
    customer_name: name,
    customer_phone: phone,
    lesson_date: date,
    start_minutes: startMin,
    slot_minutes: slotMin,
    price,
    status: "scheduled",
    kind: "individual",
  });
  if (!lessonId) return fail("No pudimos agendar la clase.");

  // Bloquea la cancha en la agenda (turno tipo "clase"), si se eligió cancha.
  if (courtId) {
    const { error, conflict } = await insertBooking(supabase, {
      club_id: clubId,
      court_id: courtId,
      booking_date: date,
      start_minutes: startMin,
      slot_minutes: slotMin,
      status: "reserved",
      kind: "class",
      customer_name: `Clase: ${name}`,
      customer_phone: phone,
      price,
      paid_at: null,
    });
    if (error) {
      // Revertimos la clase para no dejarla sin lugar en la cancha.
      await cancelLesson(supabase, lessonId, clubId);
      return fail(
        conflict
          ? "Esa cancha ya está ocupada en ese horario."
          : "No pudimos bloquear la cancha."
      );
    }
  }

  refresh();
  return { ok: true };
}

export async function dropLesson(id: string): Promise<Result> {
  const { clubId } = await requireClubAccess();
  const supabase = await createClient();
  const { error } = await cancelLesson(supabase, id, clubId);
  if (error) return fail("No pudimos cancelar la clase.");
  refresh();
  return { ok: true };
}
