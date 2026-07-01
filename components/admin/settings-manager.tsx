"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  createCategory,
  renameCategory,
  deleteCategory,
  createCourt,
  renameCourt,
  toggleCourtActive,
} from "@/app/admin/settings/actions";
import type { Tables } from "@/lib/database.types";

type Category = Pick<Tables<"categories">, "id" | "name">;
type Court = Pick<Tables<"courts">, "id" | "name" | "is_active">;

function useAction() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) => {
    setError(null);
    start(async () => {
      const res = await fn();
      if (!res.ok) setError(res.error ?? "Error");
      else router.refresh();
    });
  };
  return { run, pending, error };
}

export function SettingsManager({
  categories,
  courts,
}: {
  categories: Category[];
  courts: Court[];
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <CategoriesCard categories={categories} />
      <CourtsCard courts={courts} />
    </div>
  );
}

function CategoriesCard({ categories }: { categories: Category[] }) {
  const { run, pending, error } = useAction();
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <Card>
      <CardContent className="space-y-4 py-5">
        <h2 className="text-lg font-bold text-ink">Categorías</h2>

        <form
          ref={formRef}
          action={(fd) =>
            run(async () => {
              const r = await createCategory(fd);
              if (r.ok) formRef.current?.reset();
              return r;
            })
          }
          className="flex gap-2"
        >
          <input
            name="name"
            required
            placeholder="Ej. 4ta caballeros"
            className="flex-1 rounded-lg border border-black/10 px-3 py-2 text-sm"
          />
          <Button size="sm" type="submit" disabled={pending}>
            Agregar
          </Button>
        </form>
        {error && <p className="text-sm font-semibold text-red-600">{error}</p>}

        <ul className="space-y-2">
          {categories.length === 0 && (
            <li className="text-sm text-muted">Sin categorías.</li>
          )}
          {categories.map((c) => (
            <EditableRow
              key={c.id}
              name={c.name}
              onRename={(fd) => renameCategory(c.id, fd)}
              onDelete={() => deleteCategory(c.id)}
            />
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function CourtsCard({ courts }: { courts: Court[] }) {
  const { run, pending, error } = useAction();
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <Card>
      <CardContent className="space-y-4 py-5">
        <h2 className="text-lg font-bold text-ink">Canchas</h2>

        <form
          ref={formRef}
          action={(fd) =>
            run(async () => {
              const r = await createCourt(fd);
              if (r.ok) formRef.current?.reset();
              return r;
            })
          }
          className="flex gap-2"
        >
          <input
            name="name"
            required
            placeholder="Ej. Cancha 1"
            className="flex-1 rounded-lg border border-black/10 px-3 py-2 text-sm"
          />
          <Button size="sm" type="submit" disabled={pending}>
            Agregar
          </Button>
        </form>
        {error && <p className="text-sm font-semibold text-red-600">{error}</p>}

        <ul className="space-y-2">
          {courts.length === 0 && (
            <li className="text-sm text-muted">Sin canchas.</li>
          )}
          {courts.map((c) => (
            <CourtRow key={c.id} court={c} />
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function CourtRow({ court }: { court: Court }) {
  const { run, pending } = useAction();
  return (
    <li className="flex items-center justify-between gap-2">
      <EditableRow
        name={court.name}
        onRename={(fd) => renameCourt(court.id, fd)}
        extra={
          <Badge tone={court.is_active ? "open" : "neutral"}>
            {court.is_active ? "Activa" : "Inactiva"}
          </Badge>
        }
        action={
          <Button
            size="sm"
            variant="ghost"
            disabled={pending}
            onClick={() =>
              run(() => toggleCourtActive(court.id, !court.is_active))
            }
          >
            {court.is_active ? "Desactivar" : "Activar"}
          </Button>
        }
      />
    </li>
  );
}

function EditableRow({
  name,
  onRename,
  onDelete,
  extra,
  action,
}: {
  name: string;
  onRename: (fd: FormData) => Promise<{ ok: boolean; error?: string }>;
  onDelete?: () => Promise<{ ok: boolean; error?: string }>;
  extra?: React.ReactNode;
  action?: React.ReactNode;
}) {
  const { run, pending } = useAction();
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <form
        action={(fd) =>
          run(async () => {
            const r = await onRename(fd);
            if (r.ok) setEditing(false);
            return r;
          })
        }
        className="flex flex-1 items-center gap-2"
      >
        <input
          name="name"
          defaultValue={name}
          required
          className="flex-1 rounded-lg border border-black/10 px-3 py-1.5 text-sm"
        />
        <Button size="sm" type="submit" disabled={pending}>
          Guardar
        </Button>
        <Button
          size="sm"
          variant="ghost"
          type="button"
          onClick={() => setEditing(false)}
        >
          Cancelar
        </Button>
      </form>
    );
  }

  return (
    <div className="flex flex-1 items-center justify-between gap-2 rounded-lg border border-black/5 px-3 py-2">
      <span className="flex items-center gap-2 text-sm font-semibold text-ink">
        {name}
        {extra}
      </span>
      <div className="flex items-center gap-1">
        {action}
        <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
          Editar
        </Button>
        {onDelete && (
          <Button
            size="sm"
            variant="ghost"
            disabled={pending}
            onClick={() => run(onDelete)}
          >
            Eliminar
          </Button>
        )}
      </div>
    </div>
  );
}
