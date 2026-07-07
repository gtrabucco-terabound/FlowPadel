"use client";

import { useActionState, useRef, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import {
  updateMyPlayerProfile,
  type ProfileState,
} from "@/app/perfil/actions";
import type { Enums } from "@/lib/database.types";

const inputCls =
  "w-full rounded-xl border border-border-strong bg-surface px-3.5 py-2.5 text-ink placeholder:text-faint outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/30";

export interface ProfileFormProps {
  userId: string;
  email: string;
  phone: string | null;
  fullName: string;
  firstName: string | null;
  birthdate: string | null;
  gender: Enums<"gender"> | null;
  category: number | null;
  hand: string | null;
  homeClubId: string | null;
  clubOther: string | null;
  photoUrl: string | null;
  notifyEnabled: boolean;
  notifyMixto: boolean;
  notifyInapp: boolean;
  notifyEmail: boolean;
  notifyTelegram: boolean;
  notifyWhatsapp: boolean;
  receiveOffers: boolean;
  clubs: { id: string; name: string }[];
}

const CATEGORY_OPTIONS = [
  { value: 1, label: "1ra" },
  { value: 2, label: "2da" },
  { value: 3, label: "3ra" },
  { value: 4, label: "4ta" },
  { value: 5, label: "5ta" },
  { value: 6, label: "6ta" },
  { value: 7, label: "7ma" },
  { value: 8, label: "8va" },
  { value: 9, label: "9na" },
];

const OTHER = "__other__";

export function ProfileForm({
  userId,
  email,
  phone,
  fullName,
  firstName,
  birthdate,
  gender,
  category,
  hand,
  homeClubId,
  clubOther,
  photoUrl,
  notifyEnabled,
  notifyMixto,
  notifyInapp,
  notifyEmail,
  notifyTelegram,
  notifyWhatsapp,
  receiveOffers,
  clubs,
}: ProfileFormProps) {
  const [state, formAction, pending] = useActionState<ProfileState, FormData>(
    updateMyPlayerProfile,
    null
  );

  // Club select: valor especial OTHER revela el input de texto libre (lead CRM).
  const [clubChoice, setClubChoice] = useState<string>(
    homeClubId ?? (clubOther ? OTHER : "")
  );

  // Foto: subida al bucket avatars, guardamos la URL pública en un hidden.
  const [photo, setPhoto] = useState<string | null>(photoUrl);
  const [uploading, setUploading] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function onPickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoError(null);
    if (file.size > 5 * 1024 * 1024) {
      setPhotoError("La imagen no puede superar 5 MB.");
      return;
    }
    setUploading(true);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${userId}/avatar-${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (error) {
        setPhotoError("No pudimos subir la foto. Probá de nuevo.");
        return;
      }
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      setPhoto(data.publicUrl);
    } finally {
      setUploading(false);
    }
  }

  return (
    <form action={formAction} className="space-y-5">
      {/* Foto de perfil */}
      <div className="flex items-center gap-4">
        <div className="relative h-20 w-20 overflow-hidden rounded-full border border-border-strong bg-surface">
          {photo ? (
            <Image
              src={photo}
              alt="Foto de perfil"
              fill
              sizes="80px"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-2xl text-faint">
              📷
            </div>
          )}
        </div>
        <div className="space-y-1">
          <input type="hidden" name="photo_url" value={photo ?? ""} />
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="user"
            className="hidden"
            onChange={onPickPhoto}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? "Subiendo…" : photo ? "Cambiar foto" : "Subir / sacar foto"}
          </Button>
          <p className="text-xs text-muted">
            Recomendado: de la cara o medio cuerpo, como en los torneos.
          </p>
          {photoError && (
            <p className="text-xs text-red-600">{photoError}</p>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block space-y-1">
          <span className="text-sm font-medium text-ink">Nombre completo</span>
          <input
            name="full_name"
            defaultValue={fullName}
            className={inputCls}
            required
            minLength={2}
          />
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-medium text-ink">Nombre de pila</span>
          <input
            name="first_name"
            defaultValue={firstName ?? ""}
            className={inputCls}
            placeholder="Cómo te dicen"
          />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block space-y-1">
          <span className="text-sm font-medium text-ink">Email</span>
          <input
            value={email}
            readOnly
            disabled
            className={`${inputCls} cursor-not-allowed opacity-60`}
          />
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-medium text-ink">Celular</span>
          <input
            name="phone"
            type="tel"
            inputMode="numeric"
            defaultValue={phone ?? ""}
            placeholder="Ej: 2995718746"
            className={inputCls}
          />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block space-y-1">
          <span className="text-sm font-medium text-ink">Fecha de nacimiento</span>
          <input
            type="date"
            name="birthdate"
            defaultValue={birthdate ?? ""}
            max="2020-01-01"
            className={inputCls}
          />
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-medium text-ink">Sexo</span>
          <select name="gender" defaultValue={gender ?? ""} className={inputCls}>
            <option value="">Sin especificar</option>
            <option value="male">Hombre</option>
            <option value="female">Mujer</option>
          </select>
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block space-y-1">
          <span className="text-sm font-medium text-ink">Categoría</span>
          <select
            name="category"
            defaultValue={category ?? ""}
            className={inputCls}
          >
            <option value="">Sin categoría</option>
            {CATEGORY_OPTIONS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-medium text-ink">Posición en la cancha</span>
          <select name="hand" defaultValue={hand ?? ""} className={inputCls}>
            <option value="">Sin especificar</option>
            <option value="drive">Drive</option>
            <option value="reves">Revés</option>
          </select>
        </label>
      </div>

      {/* Club que representa (con captura de lead si no está en la lista) */}
      <div className="space-y-2">
        <label className="block space-y-1">
          <span className="text-sm font-medium text-ink">
            Club que representás
          </span>
          <select
            name="home_club_id"
            value={clubChoice === OTHER ? "" : clubChoice}
            onChange={(e) => setClubChoice(e.target.value)}
            className={inputCls}
          >
            <option value="">Libre / Sin club</option>
            {clubs.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
            <option value={OTHER}>Otro (no está en la lista)…</option>
          </select>
        </label>
        {clubChoice === OTHER && (
          <label className="block space-y-1">
            <span className="text-sm font-medium text-ink">
              Nombre de tu club
            </span>
            <input
              name="club_other"
              defaultValue={clubOther ?? ""}
              className={inputCls}
              placeholder="Escribí el nombre de tu club"
            />
            <span className="text-xs text-muted">
              Si tu club todavía no está en FlowPadel, lo tomamos igual.
            </span>
          </label>
        )}
      </div>

      {/* Preferencias de avisos (opt-in de invitaciones a torneos) */}
      <fieldset className="space-y-2 rounded-xl border border-border-soft bg-surface p-4">
        <legend className="px-1 text-sm font-medium text-ink">
          Avisos de torneos
        </legend>
        <label className="flex items-center gap-2 text-sm text-ink">
          <input
            type="checkbox"
            name="notify_enabled"
            defaultChecked={notifyEnabled}
            className="h-4 w-4 accent-accent"
          />
          Avisame cuando se abra un torneo para mí
        </label>
        <label className="flex items-center gap-2 text-sm text-ink">
          <input
            type="checkbox"
            name="notify_mixto"
            defaultChecked={notifyMixto}
            className="h-4 w-4 accent-accent"
          />
          Avisame también de torneos mixtos
        </label>

        <div className="mt-3 border-t border-border-soft pt-3">
          <p className="mb-2 text-xs font-medium text-muted">
            ¿Por dónde querés recibir los avisos?
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="flex items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                name="notify_inapp"
                defaultChecked={notifyInapp}
                className="h-4 w-4 accent-accent"
              />
              En la app 🔔
            </label>
            <label className="flex items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                name="notify_email"
                defaultChecked={notifyEmail}
                className="h-4 w-4 accent-accent"
              />
              Email ✉️
            </label>
            <label className="flex items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                name="notify_telegram"
                defaultChecked={notifyTelegram}
                className="h-4 w-4 accent-accent"
              />
              Telegram ✈️
            </label>
            <label className="flex items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                name="notify_whatsapp"
                defaultChecked={notifyWhatsapp}
                className="h-4 w-4 accent-accent"
              />
              WhatsApp 🟢
            </label>
          </div>
          <p className="mt-2 text-xs text-faint">
            Telegram y WhatsApp se activan cuando los conectes; mientras tanto
            recibís los avisos en la app y por email.
          </p>
        </div>

        <div className="mt-3 border-t border-border-soft pt-3">
          <label className="flex items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              name="receive_offers"
              defaultChecked={receiveOffers}
              className="h-4 w-4 accent-accent"
            />
            Recibir ofertas y canchas disponibles de otros clubes 🎾
          </label>
          <p className="mt-1 text-xs text-faint">
            Te llegan promos y turnos libres de clubes cerca tuyo, más allá del
            club que representás.
          </p>
        </div>
      </fieldset>

      {state && "error" in state && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}
      {state && "ok" in state && (
        <p className="rounded-lg bg-positive/15 px-3 py-2 text-sm text-positive">
          Datos guardados.
        </p>
      )}

      <Button type="submit" disabled={pending || uploading}>
        {pending ? "Guardando…" : "Guardar cambios"}
      </Button>
    </form>
  );
}
