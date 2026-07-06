"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import {
  createCourt,
  toggleCourtActive,
  updateCourtConfig,
  updateClub,
} from "@/app/admin/settings/actions";
import type { Tables } from "@/lib/database.types";

type Club = Pick<
  Tables<"clubs">,
  | "id"
  | "name"
  | "city"
  | "address"
  | "phone"
  | "contact_email"
  | "description"
  | "instagram"
  | "website"
  | "logo_url"
>;

type Court = Pick<
  Tables<"courts">,
  | "id"
  | "name"
  | "is_active"
  | "number"
  | "enclosure_type"
  | "surface"
  | "covered"
  | "lighting"
  | "panoramic"
  | "price_per_slot"
  | "slot_minutes"
  | "operating_days"
  | "open_hour"
  | "close_hour"
>;

const inputCls =
  "w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-ink";
const DAYS = [
  { v: 1, l: "L" },
  { v: 2, l: "M" },
  { v: 3, l: "M" },
  { v: 4, l: "J" },
  { v: 5, l: "V" },
  { v: 6, l: "S" },
  { v: 7, l: "D" },
];
const ENCLOSURE: Record<string, string> = {
  blindex: "Blindex",
  muro: "Muro",
  mixta: "Mixta",
};
const SURFACE: Record<string, string> = {
  cesped_sintetico: "Césped sintético",
  cemento: "Cemento",
  otro: "Otro",
};

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
  courts,
  club,
  canEditClub,
}: {
  courts: Court[];
  club: Club | null;
  canEditClub: boolean;
}) {
  return (
    <div className="max-w-2xl space-y-6">
      {club && canEditClub && <ClubInfoCard club={club} />}
      <CourtsCard courts={courts} />
    </div>
  );
}

function ClubInfoCard({ club }: { club: Club }) {
  const { run, pending, error } = useAction();
  const [logo, setLogo] = useState<string | null>(club.logo_url);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function onPickLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop()?.toLowerCase() || "png";
      const path = `${club.id}/logo-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("club-logos")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (!upErr) {
        const { data } = supabase.storage.from("club-logos").getPublicUrl(path);
        setLogo(data.publicUrl);
      }
    } finally {
      setUploading(false);
    }
  }

  return (
    <Card>
      <CardContent className="space-y-4 py-5">
        <div>
          <h2 className="text-lg font-bold text-ink">Datos del club</h2>
          <p className="text-sm text-muted">
            Información y contacto de tu club. Se muestra a los jugadores.
          </p>
        </div>

        <form
          action={(fd) => run(() => updateClub(fd))}
          className="space-y-3"
        >
          <div className="flex items-center gap-4">
            <div className="relative h-16 w-16 overflow-hidden rounded-xl border border-border-strong bg-surface">
              {logo ? (
                <Image src={logo} alt="Logo" fill sizes="64px" className="object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xl text-faint">
                  🏆
                </div>
              )}
            </div>
            <div>
              <input type="hidden" name="logo_url" value={logo ?? ""} />
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={onPickLogo}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? "Subiendo…" : logo ? "Cambiar logo" : "Subir logo"}
              </Button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1">
              <span className="text-xs font-medium text-ink">Nombre</span>
              <input name="name" defaultValue={club.name} required className={inputCls} />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-medium text-ink">Ciudad</span>
              <input name="city" defaultValue={club.city ?? ""} className={inputCls} />
            </label>
          </div>

          <label className="block space-y-1">
            <span className="text-xs font-medium text-ink">Dirección</span>
            <input name="address" defaultValue={club.address ?? ""} className={inputCls} />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1">
              <span className="text-xs font-medium text-ink">Teléfono</span>
              <input name="phone" type="tel" inputMode="numeric" defaultValue={club.phone ?? ""} className={inputCls} />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-medium text-ink">Email de contacto</span>
              <input name="contact_email" type="email" defaultValue={club.contact_email ?? ""} className={inputCls} />
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1">
              <span className="text-xs font-medium text-ink">Instagram</span>
              <input name="instagram" placeholder="@tuclub" defaultValue={club.instagram ?? ""} className={inputCls} />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-medium text-ink">Sitio web</span>
              <input name="website" placeholder="https://…" defaultValue={club.website ?? ""} className={inputCls} />
            </label>
          </div>

          <label className="block space-y-1">
            <span className="text-xs font-medium text-ink">Descripción</span>
            <textarea
              name="description"
              rows={3}
              defaultValue={club.description ?? ""}
              placeholder="Contá algo de tu club…"
              className={`${inputCls} resize-none`}
            />
          </label>

          {error && <p className="text-sm font-semibold text-red-600">{error}</p>}

          <Button type="submit" size="sm" disabled={pending || uploading}>
            {pending ? "Guardando…" : "Guardar datos del club"}
          </Button>
        </form>
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
        <div>
          <h2 className="text-lg font-bold text-ink">Canchas</h2>
          <p className="text-sm text-muted">
            Agregá tus canchas y configurá su superficie, iluminación, precio y
            horarios. Se usan para armar los partidos de los torneos.
          </p>
        </div>

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
            className={`flex-1 ${inputCls}`}
          />
          <Button size="sm" type="submit" disabled={pending}>
            Agregar
          </Button>
        </form>
        {error && <p className="text-sm font-semibold text-red-600">{error}</p>}

        <div className="space-y-2">
          {courts.length === 0 && (
            <p className="text-sm text-muted">Sin canchas.</p>
          )}
          {courts.map((c) => (
            <CourtRow key={c.id} court={c} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function CourtRow({ court }: { court: Court }) {
  const { run, pending } = useAction();
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <CourtEditForm court={court} onDone={() => setEditing(false)} />
    );
  }

  const tags: string[] = [];
  if (court.enclosure_type) tags.push(ENCLOSURE[court.enclosure_type]);
  if (court.surface) tags.push(SURFACE[court.surface]);
  if (court.covered) tags.push("Techada");
  if (court.lighting) tags.push("Luz");
  if (court.panoramic) tags.push("Panorámica");

  return (
    <div className="rounded-xl border border-border-soft px-4 py-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-ink">
            {court.number ? `#${court.number} · ` : ""}
            {court.name}
          </span>
          <Badge tone={court.is_active ? "open" : "neutral"}>
            {court.is_active ? "Activa" : "Inactiva"}
          </Badge>
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            disabled={pending}
            onClick={() => run(() => toggleCourtActive(court.id, !court.is_active))}
          >
            {court.is_active ? "Desactivar" : "Activar"}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
            Editar
          </Button>
        </div>
      </div>
      <p className="mt-1 text-xs text-muted">
        {tags.length > 0 ? tags.join(" · ") : "Sin configurar"} ·{" "}
        {court.open_hour}–{court.close_hour} h ·{" "}
        {(court.operating_days ?? []).length === 7
          ? "Todos los días"
          : (court.operating_days ?? [])
              .map((d) => DAYS.find((x) => x.v === d)?.l)
              .join("")}
        {court.price_per_slot != null
          ? ` · $${court.price_per_slot}/turno de ${court.slot_minutes}min`
          : ""}
      </p>
    </div>
  );
}

function CourtEditForm({
  court,
  onDone,
}: {
  court: Court;
  onDone: () => void;
}) {
  const { run, pending, error } = useAction();
  const days = new Set(court.operating_days ?? [1, 2, 3, 4, 5, 6, 7]);

  return (
    <form
      action={(fd) =>
        run(async () => {
          const r = await updateCourtConfig(court.id, fd);
          if (r.ok) onDone();
          return r;
        })
      }
      className="space-y-3 rounded-xl border border-border-strong bg-surface p-4"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block space-y-1">
          <span className="text-xs font-medium text-ink">Nombre</span>
          <input name="name" defaultValue={court.name} required className={inputCls} />
        </label>
        <label className="block space-y-1">
          <span className="text-xs font-medium text-ink">Nº de cancha</span>
          <input
            name="number"
            type="number"
            min={0}
            defaultValue={court.number ?? ""}
            className={inputCls}
          />
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block space-y-1">
          <span className="text-xs font-medium text-ink">Cerramiento</span>
          <select
            name="enclosure_type"
            defaultValue={court.enclosure_type ?? ""}
            className={inputCls}
          >
            <option value="">Sin especificar</option>
            <option value="blindex">Blindex (vidrio)</option>
            <option value="muro">Muro (material)</option>
            <option value="mixta">Mixta</option>
          </select>
        </label>
        <label className="block space-y-1">
          <span className="text-xs font-medium text-ink">Piso</span>
          <select
            name="surface"
            defaultValue={court.surface ?? ""}
            className={inputCls}
          >
            <option value="">Sin especificar</option>
            <option value="cesped_sintetico">Césped sintético</option>
            <option value="cemento">Cemento</option>
            <option value="otro">Otro</option>
          </select>
        </label>
      </div>

      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-sm text-ink">
          <input type="checkbox" name="covered" defaultChecked={court.covered} className="h-4 w-4 accent-accent" />
          Techada
        </label>
        <label className="flex items-center gap-2 text-sm text-ink">
          <input type="checkbox" name="lighting" defaultChecked={court.lighting} className="h-4 w-4 accent-accent" />
          Iluminación
        </label>
        <label className="flex items-center gap-2 text-sm text-ink">
          <input type="checkbox" name="panoramic" defaultChecked={court.panoramic} className="h-4 w-4 accent-accent" />
          Panorámica
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block space-y-1">
          <span className="text-xs font-medium text-ink">Duración del turno</span>
          <select
            name="slot_minutes"
            defaultValue={String(court.slot_minutes ?? 90)}
            className={inputCls}
          >
            <option value="60">60 min (1 h)</option>
            <option value="90">90 min (1.5 h)</option>
            <option value="120">120 min (2 h)</option>
          </select>
        </label>
        <label className="block space-y-1">
          <span className="text-xs font-medium text-ink">Precio por turno</span>
          <input
            name="price_per_slot"
            type="number"
            min={0}
            step="any"
            defaultValue={court.price_per_slot ?? ""}
            className={inputCls}
          />
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block space-y-1">
          <span className="text-xs font-medium text-ink">Abre (h)</span>
          <input name="open_hour" type="number" min={0} max={24} defaultValue={court.open_hour} className={inputCls} />
        </label>
        <label className="block space-y-1">
          <span className="text-xs font-medium text-ink">Cierra (h)</span>
          <input name="close_hour" type="number" min={0} max={24} defaultValue={court.close_hour} className={inputCls} />
        </label>
      </div>

      <div className="space-y-1">
        <span className="text-xs font-medium text-ink">Días operativos</span>
        <div className="flex gap-1.5">
          {DAYS.map((d) => (
            <label
              key={d.v}
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-border-strong text-xs font-semibold text-ink has-[:checked]:border-accent has-[:checked]:bg-accent has-[:checked]:text-accent-ink"
            >
              <input
                type="checkbox"
                name="days"
                value={d.v}
                defaultChecked={days.has(d.v)}
                className="sr-only"
              />
              {d.l}
            </label>
          ))}
        </div>
      </div>

      {error && <p className="text-sm font-semibold text-red-600">{error}</p>}

      <div className="flex gap-2">
        <Button size="sm" type="submit" disabled={pending}>
          {pending ? "Guardando…" : "Guardar"}
        </Button>
        <Button size="sm" variant="ghost" type="button" onClick={onDone}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
