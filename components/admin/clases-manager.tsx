"use client";

import { useState, useTransition } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type {
  Coach,
  LessonWithNames,
  GroupSessionView,
} from "@/modules/coaches/repository";
import {
  scheduleLesson,
  dropLesson,
  createGroupSession,
  joinGroup,
  leaveGroup,
  confirmGroup,
  dropGroup,
} from "@/app/admin/clases/actions";
import { trainingSlots, type CourtBand } from "@/modules/reservations/slots";

type Result = { ok: true } | { ok: false; error: string };
type Court = {
  id: string;
  name: string;
  number: number | null;
  open_hour: number;
  close_hour: number;
  slot_minutes: number;
  price_per_slot: number | null;
  bands?: CourtBand[] | null;
};

/** Opciones de horario de inicio: si hay cancha, sus turnos reales (respeta
 *  franjas); si es "Sin cancha", cada 1 h (las clases duran 1 hora). */
function startOptions(court: Court | undefined): { min: number; label: string }[] {
  const training = court ? trainingSlots(court) : [];
  if (training.length > 0) {
    return training.map((s) => ({
      min: s.start_minutes,
      label: `${hhmm(s.start_minutes)}–${hhmm(s.start_minutes + s.slot_minutes)}`,
    }));
  }
  // Sin franja de entrenamiento: cada 1 h (las clases duran 1 hora).
  const out: { min: number; label: string }[] = [];
  for (let m = 8 * 60; m <= 22 * 60; m += 60) out.push({ min: m, label: hhmm(m) });
  return out;
}

const hhmm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
const inputCls =
  "rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-accent";
const lab = "block text-xs font-medium text-ink";

function useRun() {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const run = (fn: () => Promise<Result>) =>
    start(async () => {
      setMsg(null);
      const r = await fn();
      if (!r.ok) setMsg({ ok: false, text: r.error });
    });
  return { run, pending, msg };
}

function ScheduleLesson({ coaches, courts }: { coaches: Coach[]; courts: Court[] }) {
  const { run, pending, msg } = useRun();
  const active = coaches.filter((c) => c.active);
  const [courtId, setCourtId] = useState("");
  const court = courts.find((c) => c.id === courtId);
  const opts = startOptions(court);
  if (active.length === 0)
    return <p className="text-sm text-muted">Agregá un profe activo para poder agendar clases.</p>;
  return (
    <form action={(fd) => run(() => scheduleLesson(fd))} className="grid gap-3 sm:grid-cols-2">
      <label className="space-y-1">
        <span className={lab}>Profe</span>
        <select name="coach_id" className={`${inputCls} w-full`} required>
          {active.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
        </select>
      </label>
      <label className="space-y-1">
        <span className={lab}>Cancha</span>
        <select
          name="court_id"
          className={`${inputCls} w-full`}
          value={courtId}
          onChange={(e) => setCourtId(e.target.value)}
        >
          <option value="">Sin cancha</option>
          {courts.map((c) => (
            <option key={c.id} value={c.id}>{c.number ? `#${c.number} ` : ""}{c.name}</option>
          ))}
        </select>
      </label>
      <label className="space-y-1">
        <span className={lab}>Fecha</span>
        <input name="lesson_date" type="date" required className={`${inputCls} w-full`} />
      </label>
      <label className="space-y-1">
        <span className={lab}>Horario</span>
        <select name="start_minutes" className={`${inputCls} w-full`} required>
          {opts.map((o) => (<option key={o.min} value={o.min}>{o.label}</option>))}
        </select>
      </label>
      <label className="space-y-1">
        <span className={lab}>Alumno</span>
        <input name="customer_name" required className={`${inputCls} w-full`} placeholder="Nombre del alumno" />
      </label>
      <label className="space-y-1">
        <span className={lab}>Teléfono (opcional)</span>
        <input name="customer_phone" className={`${inputCls} w-full`} placeholder="WhatsApp" />
      </label>
      <div className="sm:col-span-2 flex items-center gap-3">
        <Button size="sm" type="submit" disabled={pending}>{pending ? "Agendando…" : "Agendar clase"}</Button>
        {msg && !msg.ok && <span className="text-sm text-red-500">{msg.text}</span>}
      </div>
    </form>
  );
}

function LessonRow({ lesson }: { lesson: LessonWithNames }) {
  const { run, pending } = useRun();
  return (
    <Card>
      <CardContent className="flex items-center gap-3 py-3">
        <span className="font-mono text-sm font-semibold text-ink">
          {lesson.lesson_date} · {hhmm(lesson.start_minutes)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-ink">
            {lesson.customer_name ?? "Alumno"} · {lesson.coach?.name ?? "Profe"}
          </p>
          <p className="text-xs text-muted">
            {lesson.court ? `${lesson.court.number ? `#${lesson.court.number} ` : ""}${lesson.court.name}` : "Sin cancha"}
          </p>
        </div>
        <Button size="sm" variant="ghost" disabled={pending}
          onClick={() => { if (confirm("¿Cancelar la clase?")) run(() => dropLesson(lesson.id)); }}>
          Cancelar
        </Button>
      </CardContent>
    </Card>
  );
}

function NewGroup({ coaches, courts }: { coaches: Coach[]; courts: Court[] }) {
  const { run, pending, msg } = useRun();
  const active = coaches.filter((c) => c.active);
  const [courtId, setCourtId] = useState("");
  const court = courts.find((c) => c.id === courtId);
  const opts = startOptions(court);
  if (active.length === 0)
    return <p className="text-sm text-muted">Agregá un profe activo para crear grupos.</p>;
  return (
    <form action={(fd) => run(() => createGroupSession(fd))} className="grid gap-3 sm:grid-cols-3">
      <label className="space-y-1">
        <span className={lab}>Profe</span>
        <select name="coach_id" className={`${inputCls} w-full`} required>
          {active.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
        </select>
      </label>
      <label className="space-y-1">
        <span className={lab}>Cancha</span>
        <select
          name="court_id"
          className={`${inputCls} w-full`}
          value={courtId}
          onChange={(e) => setCourtId(e.target.value)}
        >
          <option value="">Sin cancha</option>
          {courts.map((c) => (<option key={c.id} value={c.id}>{c.number ? `#${c.number} ` : ""}{c.name}</option>))}
        </select>
      </label>
      <label className="space-y-1">
        <span className={lab}>Fecha</span>
        <input name="session_date" type="date" required className={`${inputCls} w-full`} />
      </label>
      <label className="space-y-1">
        <span className={lab}>Horario</span>
        <select name="start_minutes" className={`${inputCls} w-full`} required>
          {opts.map((o) => (<option key={o.min} value={o.min}>{o.label}</option>))}
        </select>
      </label>
      <label className="space-y-1">
        <span className={lab}>Turnos seguidos</span>
        <input name="num_slots" type="number" min={1} max={6} defaultValue={1} className={`${inputCls} w-full`} />
      </label>
      <label className="space-y-1">
        <span className={lab}>Cupo (2–8)</span>
        <input name="capacity" type="number" min={2} max={8} defaultValue={4} className={`${inputCls} w-full`} />
      </label>
      <label className="space-y-1">
        <span className={lab}>Mínimo para confirmar</span>
        <input name="min_participants" type="number" min={1} defaultValue={3} className={`${inputCls} w-full`} />
      </label>
      <label className="space-y-1">
        <span className={lab}>Precio por persona</span>
        <input name="price_per_person" type="number" min={0} className={`${inputCls} w-full`} placeholder="Opcional" />
      </label>
      <div className="flex items-end gap-3">
        <Button size="sm" type="submit" disabled={pending}>{pending ? "Creando…" : "Crear grupo"}</Button>
        {msg && !msg.ok && <span className="text-sm text-red-500">{msg.text}</span>}
      </div>
    </form>
  );
}

function GroupCard({ group }: { group: GroupSessionView }) {
  const { run, pending } = useRun();
  const parts = (group.participants ?? []).filter((p) => p.status !== "cancelled");
  const full = parts.length >= group.capacity;
  const total = group.num_slots * (group.slot_minutes || 90);
  const end = group.start_minutes + total;
  return (
    <Card>
      <CardContent className="space-y-3 py-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="font-semibold text-ink">
              {group.session_date} · {hhmm(group.start_minutes)}–{hhmm(end)}
              {group.status === "confirmed" && <span className="ml-2 text-xs font-normal text-emerald-500">Confirmado</span>}
            </p>
            <p className="text-xs text-muted">
              {group.coach?.name ?? "Profe"}
              {group.court ? ` · ${group.court.number ? `#${group.court.number} ` : ""}${group.court.name}` : ""}
              {group.price_per_person != null ? ` · $${group.price_per_person}/persona` : ""}
            </p>
          </div>
          <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${full ? "bg-emerald-500/15 text-emerald-400" : "bg-surface-2 text-muted"}`}>
            {parts.length}/{group.capacity}
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          {parts.length === 0 && <span className="text-xs text-muted">Sin jugadores anotados.</span>}
          {parts.map((p) => (
            <span key={p.id} className="flex items-center gap-1 rounded-full border border-border-soft bg-canvas px-2.5 py-1 text-xs text-ink">
              {p.customer_name}
              <button type="button" className="text-muted hover:text-red-500" onClick={() => run(() => leaveGroup(p.id))}>×</button>
            </span>
          ))}
        </div>

        {!full && (
          <form action={(fd) => run(() => joinGroup(fd))} className="flex flex-wrap items-end gap-2">
            <input type="hidden" name="session_id" value={group.id} />
            <input name="customer_name" required className={inputCls} placeholder="Nombre del jugador" />
            <input name="customer_phone" className={inputCls} placeholder="WhatsApp (opcional)" />
            <Button size="sm" variant="outline" type="submit" disabled={pending}>+ Sumar</Button>
          </form>
        )}

        <div className="flex items-center gap-2">
          {group.status !== "confirmed" && (
            <Button size="sm" disabled={pending || parts.length < group.min_participants}
              onClick={() => run(() => confirmGroup(group.id))}>
              Confirmar grupo
            </Button>
          )}
          <Button size="sm" variant="ghost" disabled={pending}
            onClick={() => { if (confirm("¿Cancelar el grupo?")) run(() => dropGroup(group.id)); }}>
            Cancelar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function ClasesManager({
  coaches,
  lessons,
  groups,
  courts,
}: {
  coaches: Coach[];
  lessons: LessonWithNames[];
  groups: GroupSessionView[];
  courts: Court[];
}) {
  const activeCoaches = coaches.filter((c) => c.active);
  if (activeCoaches.length === 0) {
    return (
      <Card>
        <CardContent className="space-y-2 py-8 text-center">
          <p className="text-sm text-ink">Todavía no tenés profes activos.</p>
          <p className="text-sm text-muted">
            Cargá tus profesores y su disponibilidad en{" "}
            <a href="/admin/settings" className="font-semibold text-accent">Configuración → Profesores</a>{" "}
            para poder agendar clases y armar entrenamientos.
          </p>
        </CardContent>
      </Card>
    );
  }
  return (
    <div className="max-w-3xl space-y-8">
      <section>
        <h2 className="mb-3 text-lg font-bold text-ink">Agendar una clase</h2>
        <Card>
          <CardContent className="py-5">
            <ScheduleLesson coaches={coaches} courts={courts} />
          </CardContent>
        </Card>
      </section>

      <section>
        <h2 className="mb-1 text-lg font-bold text-ink">Entrenamientos grupales</h2>
        <p className="mb-3 text-sm text-muted">
          Creá un grupo con cupo y precio por persona. Los jugadores se suman
          (y el bot lo va llenando).
        </p>
        <Card>
          <CardContent className="py-5">
            <NewGroup coaches={coaches} courts={courts} />
          </CardContent>
        </Card>
        {groups.length > 0 && (
          <div className="mt-3 space-y-3">
            {groups.map((g) => (<GroupCard key={g.id} group={g} />))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-bold text-ink">Próximas clases</h2>
        {lessons.length === 0 ? (
          <Card><CardContent className="py-8 text-center text-sm text-muted">No hay clases agendadas.</CardContent></Card>
        ) : (
          <div className="space-y-2">
            {lessons.map((l) => (<LessonRow key={l.id} lesson={l} />))}
          </div>
        )}
      </section>
    </div>
  );
}
