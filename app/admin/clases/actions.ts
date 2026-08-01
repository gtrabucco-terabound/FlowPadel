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
  setLessonBooking,
  getLessonBooking,
  insertGroupSession,
  setGroupSessionStatus,
  setGroupSessionBooking,
  getGroupSessionBooking,
  addParticipant,
  removeParticipant,
  getGroupSession,
  countParticipants,
  availabilityOverlaps,
} from "@/modules/coaches/repository";
import { insertBooking, deleteBooking } from "@/modules/reservations/repository";

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
  from_hour: z.coerce.number().int().min(0).max(23),
  to_hour: z.coerce.number().int().min(1).max(24),
});

export async function createAvailability(formData: FormData): Promise<Result> {
  const parsed = availSchema.safeParse({
    coach_id: formData.get("coach_id"),
    from_hour: formData.get("from_hour"),
    to_hour: formData.get("to_hour"),
  });
  if (!parsed.success) return fail("Datos de disponibilidad inválidos.");
  if (parsed.data.to_hour <= parsed.data.from_hour)
    return fail("La hora de fin debe ser posterior a la de inicio.");

  // Días seleccionados (checkboxes "weekday", 1=Lun..7=Dom).
  const weekdays = [...new Set(
    formData.getAll("weekday").map((v) => Number(v)).filter((n) => n >= 1 && n <= 7)
  )];
  if (weekdays.length === 0) return fail("Elegí al menos un día.");

  await requireClubAccess();
  const supabase = await createClient();
  const start = parsed.data.from_hour * 60;
  const end = parsed.data.to_hour * 60;

  let added = 0;
  let skipped = 0;
  for (const weekday of weekdays) {
    // Salteamos los días que ya tienen una franja que se pisa.
    if (await availabilityOverlaps(supabase, parsed.data.coach_id, weekday, start, end)) {
      skipped++;
      continue;
    }
    const { error } = await addAvailability(supabase, {
      coach_id: parsed.data.coach_id,
      weekday,
      start_minutes: start,
      end_minutes: end,
    });
    if (error) return fail("No pudimos guardar la disponibilidad.");
    added++;
  }
  refresh();
  if (added === 0 && skipped > 0)
    return fail("Esos días ya tenían una franja que se pisa con esta.");
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
    const { error, conflict, id: bookingId } = await insertBooking(supabase, {
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
    // Guardamos el vínculo para poder liberar la cancha al cancelar.
    if (bookingId) await setLessonBooking(supabase, lessonId, clubId, bookingId);
  }

  refresh();
  return { ok: true };
}

export async function dropLesson(id: string): Promise<Result> {
  const { clubId } = await requireClubAccess();
  const supabase = await createClient();
  // Liberamos la cancha bloqueada por la clase, si tenía.
  const bookingId = await getLessonBooking(supabase, id, clubId);
  const { error } = await cancelLesson(supabase, id, clubId);
  if (error) return fail("No pudimos cancelar la clase.");
  if (bookingId) await deleteBooking(supabase, bookingId);
  refresh();
  return { ok: true };
}

/* ---- Sesiones grupales (Fase 3) ---- */

export async function createGroupSession(formData: FormData): Promise<Result> {
  const coachId = String(formData.get("coach_id") ?? "");
  const date = String(formData.get("session_date") ?? "");
  const startMin = num(formData.get("start_minutes"));
  const numSlots = num(formData.get("num_slots")) ?? 1;
  const capacity = num(formData.get("capacity")) ?? 4;
  const minP = num(formData.get("min_participants")) ?? 3;
  const price = num(formData.get("price_per_person"));
  const courtId = txt(formData.get("court_id"));

  if (!coachId) return fail("Elegí un profe.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return fail("Fecha inválida.");
  if (startMin == null || startMin < 0) return fail("Elegí un horario.");
  if (capacity < 2 || capacity > 8) return fail("El cupo debe ser entre 2 y 8.");

  const { clubId } = await requireClubAccess();
  const supabase = await createClient();
  const totalMinutes = numSlots * 90;

  const sessionId = await insertGroupSession(supabase, {
    club_id: clubId,
    coach_id: coachId,
    court_id: courtId,
    session_date: date,
    start_minutes: startMin,
    slot_minutes: 90,
    num_slots: numSlots,
    capacity,
    min_participants: minP,
    price_per_person: price,
    status: "open",
  });
  if (!sessionId) return fail("No pudimos crear el grupo.");

  // Bloquea la cancha (todo el bloque de turnos seguidos) si se eligió.
  if (courtId) {
    const { error, conflict, id: bookingId } = await insertBooking(supabase, {
      club_id: clubId,
      court_id: courtId,
      booking_date: date,
      start_minutes: startMin,
      slot_minutes: totalMinutes,
      status: "reserved",
      kind: "class",
      customer_name: "Entrenamiento grupal",
      customer_phone: null,
      price: null,
      paid_at: null,
    });
    if (error) {
      await setGroupSessionStatus(supabase, sessionId, clubId, "cancelled");
      return fail(
        conflict ? "Esa cancha ya está ocupada en ese horario." : "No pudimos bloquear la cancha."
      );
    }
    if (bookingId) await setGroupSessionBooking(supabase, sessionId, clubId, bookingId);
  }

  refresh();
  return { ok: true };
}

export async function joinGroup(formData: FormData): Promise<Result> {
  const sessionId = String(formData.get("session_id") ?? "");
  const name = String(formData.get("customer_name") ?? "").trim();
  const phone = txt(formData.get("customer_phone"));
  if (!sessionId) return fail("Grupo inválido.");
  if (name.length < 2) return fail("Ingresá el nombre del jugador.");

  const { clubId } = await requireClubAccess();
  const supabase = await createClient();
  const session = await getGroupSession(supabase, sessionId, clubId);
  if (!session) return fail("Grupo no encontrado.");
  const current = await countParticipants(supabase, sessionId);
  if (current >= session.capacity) return fail("El grupo ya está completo.");

  const { error } = await addParticipant(supabase, sessionId, name, phone);
  if (error) return fail("No pudimos sumar al jugador.");
  // Al alcanzar el mínimo, confirmamos el grupo automáticamente (igual que el bot).
  if (session.status === "open" && current + 1 >= session.min_participants) {
    await setGroupSessionStatus(supabase, sessionId, clubId, "confirmed");
  }
  refresh();
  return { ok: true };
}

export async function leaveGroup(id: string): Promise<Result> {
  await requireClubAccess();
  const supabase = await createClient();
  const { error } = await removeParticipant(supabase, id);
  if (error) return fail("No pudimos quitar al jugador.");
  refresh();
  return { ok: true };
}

export async function confirmGroup(id: string): Promise<Result> {
  const { clubId } = await requireClubAccess();
  const supabase = await createClient();
  const { error } = await setGroupSessionStatus(supabase, id, clubId, "confirmed");
  if (error) return fail("No pudimos confirmar el grupo.");
  refresh();
  return { ok: true };
}

export async function dropGroup(id: string): Promise<Result> {
  const { clubId } = await requireClubAccess();
  const supabase = await createClient();
  // Liberamos la cancha bloqueada por el grupo, si tenía.
  const bookingId = await getGroupSessionBooking(supabase, id, clubId);
  const { error } = await setGroupSessionStatus(supabase, id, clubId, "cancelled");
  if (error) return fail("No pudimos cancelar el grupo.");
  if (bookingId) await deleteBooking(supabase, bookingId);
  refresh();
  return { ok: true };
}
