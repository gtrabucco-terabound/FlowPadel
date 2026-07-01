"use client";

import { useRef, useState, useTransition } from "react";
import { createEvent } from "@/app/admin/events/actions";
import { Button } from "@/components/ui/button";

export interface RivalClubOption {
  id: string;
  name: string;
}

export function NewEventDialog({
  rivalClubs = [],
}: {
  rivalClubs?: RivalClubOption[];
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [categorySystem, setCategorySystem] = useState<"fixed" | "suma">(
    "fixed"
  );
  const [interclub, setInterclub] = useState(false);

  function open() {
    setError(null);
    dialogRef.current?.showModal();
  }

  function onSubmit(formData: FormData) {
    startTransition(async () => {
      const res = await createEvent(formData);
      if (res && !res.ok) {
        setError(res.error);
      }
      // On success the action redirects; nothing else to do.
    });
  }

  return (
    <>
      <Button size="sm" onClick={open}>
        Nuevo evento
      </Button>

      <dialog
        ref={dialogRef}
        className="fixed inset-0 m-auto h-fit w-[calc(100%-2rem)] max-w-md rounded-xl border border-border-soft bg-surface p-0 text-ink shadow-xl backdrop:bg-black/60"
      >
        <form action={onSubmit} className="space-y-4 p-5">
          <h2 className="text-lg font-bold text-ink">Nuevo evento</h2>

          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-ink">
              Nombre
            </span>
            <input
              name="name"
              required
              minLength={2}
              placeholder="Torneo de verano"
              className="w-full rounded-lg border border-border-soft bg-canvas px-3 py-2 text-sm text-ink placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-padel-500"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-ink">
              Tipo
            </span>
            <select
              name="event_type"
              defaultValue="tournament"
              className="w-full rounded-lg border border-border-soft bg-canvas px-3 py-2 text-sm text-ink placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-padel-500"
            >
              <option value="tournament">Torneo</option>
              <option value="open_play">Cancha abierta</option>
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-ink">
              Modalidad
            </span>
            <select
              name="modality"
              defaultValue="caballeros"
              className="w-full rounded-lg border border-border-soft bg-canvas px-3 py-2 text-sm text-ink placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-padel-500"
            >
              <option value="caballeros">Caballeros</option>
              <option value="damas">Damas</option>
              <option value="mixto">Mixto</option>
              <option value="combinado">Combinado</option>
            </select>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-ink">
                Sistema de categoría
              </span>
              <select
                name="category_system"
                value={categorySystem}
                onChange={(e) =>
                  setCategorySystem(e.target.value as "fixed" | "suma")
                }
                className="w-full rounded-lg border border-border-soft bg-canvas px-3 py-2 text-sm text-ink placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-padel-500"
              >
                <option value="fixed">Fija</option>
                <option value="suma">Suma</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-ink">
                Categoría
              </span>
              {categorySystem === "fixed" ? (
                <input
                  name="category_value"
                  placeholder="4ta"
                  className="w-full rounded-lg border border-border-soft bg-canvas px-3 py-2 text-sm text-ink placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-padel-500"
                />
              ) : (
                <select
                  name="category_value"
                  defaultValue="13"
                  className="w-full rounded-lg border border-border-soft bg-canvas px-3 py-2 text-sm text-ink placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-padel-500"
                >
                  <option value="10">10</option>
                  <option value="12">12</option>
                  <option value="13">13</option>
                  <option value="14">14</option>
                  <option value="15">15</option>
                </select>
              )}
            </label>
          </div>

          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-ink">
              Fecha de inicio (opcional)
            </span>
            <input
              name="start_date"
              type="date"
              className="w-full rounded-lg border border-border-soft bg-canvas px-3 py-2 text-sm text-ink placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-padel-500"
            />
          </label>

          <label className="flex items-center gap-2 text-sm font-semibold text-ink">
            <input
              name="is_interclub"
              type="checkbox"
              checked={interclub}
              onChange={(e) => setInterclub(e.target.checked)}
              className="h-4 w-4"
            />
            Torneo interclub
          </label>

          {interclub && (
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-ink">
                Club rival
              </span>
              <select
                name="rival_club_id"
                defaultValue=""
                required
                className="w-full rounded-lg border border-border-soft bg-canvas px-3 py-2 text-sm text-ink placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-padel-500"
              >
                <option value="" disabled>
                  Elegí un club
                </option>
                {rivalClubs.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
          )}

          {error && <p className="text-sm font-semibold text-red-600">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => dialogRef.current?.close()}
            >
              Cancelar
            </Button>
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? "Creando…" : "Crear"}
            </Button>
          </div>
        </form>
      </dialog>
    </>
  );
}
