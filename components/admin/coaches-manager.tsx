"use client";

import { useState, useTransition } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Coach, CoachAvailability } from "@/modules/coaches/repository";
import {
  createCoach,
  toggleCoach,
  removeCoach,
  createAvailability,
  removeAvailability,
} from "@/app/admin/clases/actions";

type Result = { ok: true } | { ok: false; error: string };

const DOW = ["", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const DOW_SHORT = ["", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const hhmm = (m: number) =>
  `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
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

function AvailabilityForm({
  coachId,
  onSubmit,
  pending,
}: {
  coachId: string;
  onSubmit: (fd: FormData) => void;
  pending: boolean;
}) {
  const [days, setDays] = useState<number[]>([1]);
  const toggle = (d: number) =>
    setDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));
  const preset = (ds: number[]) => setDays(ds);

  return (
    <form
      action={(fd) => {
        days.forEach((d) => fd.append("weekday", String(d)));
        onSubmit(fd);
        setDays([1]);
      }}
      className="space-y-2"
    >
      <input type="hidden" name="coach_id" value={coachId} />
      <div className="flex flex-wrap items-center gap-1.5">
        {DOW_SHORT.slice(1).map((d, i) => {
          const day = i + 1;
          const on = days.includes(day);
          return (
            <button
              key={day}
              type="button"
              onClick={() => toggle(day)}
              className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                on
                  ? "border-accent bg-accent text-accent-ink"
                  : "border-border-soft bg-canvas text-muted hover:text-ink"
              }`}
            >
              {d}
            </button>
          );
        })}
        <span className="mx-1 text-border-strong">|</span>
        <button type="button" onClick={() => preset([1, 2, 3, 4, 5])}
          className="rounded-full border border-border-soft px-2.5 py-1 text-xs text-muted hover:text-ink">
          Lun–Vie
        </button>
        <button type="button" onClick={() => preset([1, 2, 3, 4, 5, 6])}
          className="rounded-full border border-border-soft px-2.5 py-1 text-xs text-muted hover:text-ink">
          Lun–Sáb
        </button>
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <span className="text-xs text-muted">De</span>
        <input name="from_hour" type="number" min={0} max={23} defaultValue={8} className={`${inputCls} w-16`} aria-label="Desde (hora)" />
        <span className="text-sm text-muted">a</span>
        <input name="to_hour" type="number" min={1} max={24} defaultValue={17} className={`${inputCls} w-16`} aria-label="Hasta (hora)" />
        <span className="text-xs text-muted">hs</span>
        <Button size="sm" variant="outline" type="submit" disabled={pending || days.length === 0}>
          + Disponibilidad
        </Button>
      </div>
    </form>
  );
}

function CoachRow({ coach, availability }: { coach: Coach; availability: CoachAvailability[] }) {
  const { run, pending } = useRun();
  const avail = availability.filter((a) => a.coach_id === coach.id);
  return (
    <Card>
      <CardContent className="space-y-3 py-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="font-semibold text-ink">
              {coach.name}{" "}
              {!coach.active && <span className="text-xs font-normal text-muted">(inactivo)</span>}
            </p>
            {coach.phone && <p className="text-xs text-muted">{coach.phone}</p>}
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" disabled={pending}
              onClick={() => run(() => toggleCoach(coach.id, !coach.active))}>
              {coach.active ? "Desactivar" : "Activar"}
            </Button>
            <Button size="sm" variant="ghost" disabled={pending}
              onClick={() => { if (confirm(`¿Eliminar a ${coach.name}?`)) run(() => removeCoach(coach.id)); }}>
              Eliminar
            </Button>
          </div>
        </div>

        {/* Disponibilidad */}
        <div className="flex flex-wrap items-center gap-2">
          {avail.length === 0 && (
            <span className="text-xs text-muted">Sin disponibilidad cargada.</span>
          )}
          {avail.map((a) => (
            <span key={a.id} className="flex items-center gap-1 rounded-full border border-border-soft bg-canvas px-2.5 py-1 text-xs text-ink">
              {DOW[a.weekday]} {hhmm(a.start_minutes)}–{hhmm(a.end_minutes)}
              <button type="button" className="text-muted hover:text-red-500"
                onClick={() => run(() => removeAvailability(a.id))}>×</button>
            </span>
          ))}
        </div>
        <AvailabilityForm coachId={coach.id} onSubmit={(fd) => run(() => createAvailability(fd))} pending={pending} />
      </CardContent>
    </Card>
  );
}

function NewCoach() {
  const { run, pending, msg } = useRun();
  return (
    <Card>
      <CardContent className="py-4">
        <form action={(fd) => run(() => createCoach(fd))} className="flex flex-wrap items-end gap-2">
          <label className="space-y-1">
            <span className={lab}>Nombre del profe</span>
            <input name="name" required className={inputCls} placeholder="Juan Pérez" />
          </label>
          <label className="space-y-1">
            <span className={lab}>Teléfono</span>
            <input name="phone" className={inputCls} placeholder="11 2233 4455" />
          </label>
          <Button size="sm" type="submit" disabled={pending}>{pending ? "Agregando…" : "Agregar profe"}</Button>
          {msg && !msg.ok && <span className="text-sm text-red-500">{msg.text}</span>}
        </form>
      </CardContent>
    </Card>
  );
}

export function CoachesManager({
  coaches,
  availability,
}: {
  coaches: Coach[];
  availability: CoachAvailability[];
}) {
  return (
    <Card>
      <CardContent className="space-y-4 py-5">
        <div>
          <h2 className="text-lg font-bold text-ink">Profesores</h2>
          <p className="text-sm text-muted">
            Los profes del club y sus días/horario de entrenamiento. Esto es lo que
            abre los turnos de clase en la agenda: donde un profe está disponible y la
            cancha tiene franja de entrenamiento, la grilla pasa a turnos de 1 hora.
          </p>
        </div>
        <div className="space-y-3">
          {coaches.map((c) => (
            <CoachRow key={c.id} coach={c} availability={availability} />
          ))}
          <NewCoach />
        </div>
      </CardContent>
    </Card>
  );
}
