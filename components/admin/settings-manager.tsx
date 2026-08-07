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
  updateClubPayments,
  disconnectClubPayments,
  updateBookingCharge,
  updateOccupancy,
  createCourtBand,
  removeCourtBand,
  connectClubWhatsapp,
  refreshClubWhatsapp,
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

type Band = {
  id: string;
  court_id: string;
  start_minutes: number;
  end_minutes: number;
  slot_minutes: number;
  price: number | null;
};

const inputCls =
  "w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-ink";
const hhmmLabel = (m: number) =>
  `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
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
  bands,
  club,
  canEditClub,
  mpConnected,
  bookingChargeType,
  bookingChargeValue,
  bookingPayAtClub,
  occupancy,
  occupancyEnabled = true,
  privateLineEnabled = false,
  whatsapp,
}: {
  courts: Court[];
  bands: Band[];
  club: Club | null;
  canEditClub: boolean;
  mpConnected: boolean;
  bookingChargeType: "full" | "percent" | "fixed";
  bookingChargeValue: number | null;
  bookingPayAtClub: boolean;
  occupancy: OccupancyConfig;
  occupancyEnabled?: boolean;
  privateLineEnabled?: boolean;
  whatsapp: WhatsappConfig;
}) {
  return (
    <div className="max-w-2xl space-y-6">
      {club && canEditClub && <ClubInfoCard club={club} />}
      {canEditClub && (
        <PaymentsCard
          connected={mpConnected}
          chargeType={bookingChargeType}
          chargeValue={bookingChargeValue}
          payAtClub={bookingPayAtClub}
        />
      )}
      {canEditClub && privateLineEnabled && <WhatsappCard whatsapp={whatsapp} />}
      {canEditClub && occupancyEnabled && <OccupancyCard occupancy={occupancy} />}
      <CourtsCard courts={courts} bands={bands} />
    </div>
  );
}

type WhatsappConfig = {
  connected: boolean;
  status: string | null;
  phone: string | null;
};

function WhatsappCard({ whatsapp }: { whatsapp: WhatsappConfig }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(whatsapp.status);
  const [phone, setPhone] = useState<string | null>(whatsapp.phone);

  const src = (b: string) =>
    b.startsWith("data:") ? b : `data:image/png;base64,${b}`;

  const generate = () => {
    setError(null);
    start(async () => {
      const res = await connectClubWhatsapp();
      if (!res.ok) setError(res.error);
      else {
        setQr(res.qr);
        setStatus("connecting");
      }
    });
  };

  const check = () => {
    setError(null);
    start(async () => {
      const res = await refreshClubWhatsapp();
      if (!res.ok) setError(res.error);
      else {
        setStatus(res.status);
        setPhone(res.phone);
        if (res.status === "connected") setQr(null);
        router.refresh();
      }
    });
  };

  const connected = status === "connected";

  return (
    <Card>
      <CardContent className="space-y-3 py-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-ink">WhatsApp propio del club</h2>
          <Badge tone={connected ? "live" : "neutral"}>
            {connected
              ? phone
                ? `Conectado · ${phone}`
                : "Conectado"
              : status === "connecting"
                ? "Esperando escaneo"
                : "Sin conectar"}
          </Badge>
        </div>
        <p className="text-sm text-muted">
          Conectá el número propio del club (tu línea privada). El bot de reservas
          y los avisos de canchas van a salir desde este WhatsApp en vez del número
          general de FlowPadel.
        </p>

        {qr && !connected && (
          <div className="rounded-lg border border-border-soft bg-surface p-4 text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src(qr)}
              alt="Código QR de WhatsApp"
              className="mx-auto h-56 w-56"
            />
            <p className="mt-2 text-xs text-muted">
              Abrí WhatsApp → Dispositivos vinculados → Vincular dispositivo, y
              escaneá este código. Después tocá &quot;Verificar estado&quot;.
            </p>
          </div>
        )}

        {error && <p className="text-sm font-semibold text-red-600">{error}</p>}

        <div className="flex flex-wrap gap-2">
          {!connected && (
            <Button size="sm" onClick={generate} disabled={pending}>
              {pending ? "Generando…" : qr ? "Regenerar QR" : "Conectar WhatsApp"}
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={check} disabled={pending}>
            Verificar estado
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

type OccupancyConfig = {
  enabled: boolean;
  waTarget: string;
  discountPct: number;
  leadMinutes: number;
  segmentEnabled: boolean;
  segmentDiscountPct: number;
  segmentMinMatches: number;
  segmentInactiveDays: number;
  segmentMaxPerRun: number;
};

function OccupancyCard({ occupancy }: { occupancy: OccupancyConfig }) {
  const { run, pending, error } = useAction();
  const [enabled, setEnabled] = useState(occupancy.enabled);
  const [segEnabled, setSegEnabled] = useState(occupancy.segmentEnabled);

  return (
    <Card>
      <CardContent className="space-y-4 py-5">
        <div>
          <h2 className="text-lg font-bold text-ink">Motor de ocupación (WhatsApp)</h2>
          <p className="text-sm text-muted">
            Ayuda a llenar los turnos vacíos. Todo lo definís vos: los descuentos,
            a partir de cuándo se ofrecen y a quién. Si lo apagás, no se envía nada.
          </p>
        </div>
        <form action={(fd) => run(() => updateOccupancy(fd))} className="space-y-5">
          {/* Canal 1: grupo por ocupación */}
          <div className="space-y-3 rounded-xl border border-border-soft p-3">
            <p className="text-sm font-semibold text-ink">1 · Publicar al grupo del club</p>
            <label className="flex items-start gap-2">
              <input
                type="checkbox"
                name="enabled"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-accent"
              />
              <span className="text-sm text-ink">
                Publicar automáticamente los turnos libres al grupo de WhatsApp (cada 2 h)
              </span>
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-medium text-ink">
                Grupo de WhatsApp (JID) o número donde publicar
              </span>
              <input
                name="wa_target"
                defaultValue={occupancy.waTarget}
                placeholder="Ej: 120363XXXXXXXX@g.us"
                className={inputCls}
              />
              <span className="block text-xs text-muted">
                Es el ID del grupo (termina en <b>@g.us</b>). Cuando el grupo le escribe al bot,
                Evolution te devuelve ese ID.
              </span>
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="block space-y-1">
                <span className="text-xs font-medium text-ink">Descuento last-minute (%)</span>
                <input
                  name="discount_pct"
                  type="number"
                  min={0}
                  max={90}
                  defaultValue={occupancy.discountPct}
                  className={inputCls}
                />
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-medium text-ink">Ofrecer si arranca en (min)</span>
                <input
                  name="lead_minutes"
                  type="number"
                  min={15}
                  defaultValue={occupancy.leadMinutes}
                  className={inputCls}
                />
              </label>
            </div>
            <p className="text-xs text-muted">
              El descuento del {occupancy.discountPct}% se aplica solo a los turnos que arrancan
              dentro de la ventana y siguen vacíos — y se cobra ya rebajado al reservar.
            </p>
          </div>

          {/* Canal 2: invitaciones dirigidas a jugadores */}
          <div className="space-y-3 rounded-xl border border-border-soft p-3">
            <p className="text-sm font-semibold text-ink">2 · Invitar a jugadores del club</p>
            <label className="flex items-start gap-2">
              <input
                type="checkbox"
                name="segment_enabled"
                checked={segEnabled}
                onChange={(e) => setSegEnabled(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-accent"
              />
              <span className="text-sm text-ink">
                Cuando haya un turno con oferta, invitar por WhatsApp a jugadores del club
              </span>
            </label>
            <p className="text-xs text-muted">
              Solo se les escribe a jugadores que <b>aceptaron recibir ofertas</b>. Se prioriza a
              los <b>fieles</b> (muchos partidos) y a los <b>dormidos</b> (hace tiempo que no reservan).
              Nunca se le escribe dos veces al mismo jugador el mismo día.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <label className="block space-y-1">
                <span className="text-xs font-medium text-ink">Descuento de la invitación (%)</span>
                <input
                  name="segment_discount_pct"
                  type="number"
                  min={0}
                  max={90}
                  defaultValue={occupancy.segmentDiscountPct}
                  className={inputCls}
                />
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-medium text-ink">Máx. invitaciones por envío</span>
                <input
                  name="segment_max_per_run"
                  type="number"
                  min={1}
                  max={200}
                  defaultValue={occupancy.segmentMaxPerRun}
                  className={inputCls}
                />
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-medium text-ink">&quot;Fiel&quot; desde (partidos)</span>
                <input
                  name="segment_min_matches"
                  type="number"
                  min={0}
                  defaultValue={occupancy.segmentMinMatches}
                  className={inputCls}
                />
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-medium text-ink">&quot;Dormido&quot; desde (días)</span>
                <input
                  name="segment_inactive_days"
                  type="number"
                  min={1}
                  defaultValue={occupancy.segmentInactiveDays}
                  className={inputCls}
                />
              </label>
            </div>
          </div>

          {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? "Guardando…" : "Guardar motor de ocupación"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function PaymentsCard({
  connected,
  chargeType,
  chargeValue,
  payAtClub,
}: {
  connected: boolean;
  chargeType: "full" | "percent" | "fixed";
  chargeValue: number | null;
  payAtClub: boolean;
}) {
  const { run, pending, error } = useAction();
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <Card>
      <CardContent className="space-y-4 py-5">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold text-ink">Cobros — Mercado Pago</h2>
            <p className="text-sm text-muted">
              Conectá tu cuenta para cobrar la seña/inscripción online. La plata
              va directo a tu Mercado Pago.
            </p>
          </div>
          <Badge tone={connected ? "open" : "neutral"}>
            {connected ? "Conectado" : "Sin conectar"}
          </Badge>
        </div>

        <div className="rounded-xl border border-border-soft bg-surface p-3 text-xs text-muted">
          <p className="mb-1 font-semibold text-ink">Cómo obtener tu Access Token:</p>
          1. Entrá a <span className="text-padel-600">mercadopago.com.ar/developers</span> con tu cuenta.<br />
          2. Creá una aplicación (o usá una existente).<br />
          3. Copiá el <b>Access Token</b> de producción y pegalo acá.
        </div>

        <form
          ref={formRef}
          action={(fd) =>
            run(async () => {
              const r = await updateClubPayments(fd);
              if (r.ok) formRef.current?.reset();
              return r;
            })
          }
          className="space-y-3"
        >
          <label className="block space-y-1">
            <span className="text-xs font-medium text-ink">
              Access Token de Mercado Pago
            </span>
            <input
              name="mp_access_token"
              type="password"
              autoComplete="off"
              placeholder={connected ? "•••••••• (guardado) — pegá uno nuevo para cambiarlo" : "APP_USR-..."}
              className={inputCls}
            />
          </label>
          {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
          <div className="flex items-center gap-2">
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? "Guardando…" : connected ? "Actualizar token" : "Conectar"}
            </Button>
            {connected && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={pending}
                onClick={() => run(() => disconnectClubPayments())}
              >
                Desconectar
              </Button>
            )}
          </div>
        </form>

        <BookingChargeForm
          connected={connected}
          chargeType={chargeType}
          chargeValue={chargeValue}
          payAtClub={payAtClub}
        />
      </CardContent>
    </Card>
  );
}

function BookingChargeForm({
  connected,
  chargeType,
  chargeValue,
  payAtClub,
}: {
  connected: boolean;
  chargeType: "full" | "percent" | "fixed";
  chargeValue: number | null;
  payAtClub: boolean;
}) {
  const { run, pending, error } = useAction();
  const [type, setType] = useState<"full" | "percent" | "fixed">(chargeType);
  const [atClub, setAtClub] = useState<boolean>(payAtClub);

  return (
    <div className="border-t border-border-soft pt-4">
      <h3 className="text-sm font-bold text-ink">Cobro de reservas de cancha</h3>
      <p className="mb-3 text-xs text-muted">
        Cómo se cobra al reservar un turno desde la app.
      </p>
      <form action={(fd) => run(() => updateBookingCharge(fd))} className="space-y-3">
        <label className="flex items-start gap-2 rounded-lg border border-border-strong p-3">
          <input
            type="checkbox"
            name="booking_pay_at_club"
            checked={atClub}
            onChange={(e) => setAtClub(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-accent"
          />
          <span className="text-sm text-ink">
            Abonar en el club (sin pago online)
            <span className="mt-0.5 block text-xs text-muted">
              La reserva queda confirmada al instante y el jugador paga en el club.
              No se cobra por Mercado Pago.
            </span>
          </span>
        </label>

        {atClub ? (
          <p className="text-xs text-muted">
            Con esta opción, las reservas se confirman sin pago online.
          </p>
        ) : (
        <>
        {!connected && (
          <p className="text-xs font-medium text-amber-700">
            Conectá Mercado Pago arriba para poder cobrar reservas online.
          </p>
        )}
        <p className="text-xs text-muted">
          Cuánto se cobra online al reservar. El resto (si es seña) se paga en el club.
        </p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {(
            [
              { v: "full", l: "Total del turno" },
              { v: "percent", l: "Seña (% del turno)" },
              { v: "fixed", l: "Seña (monto fijo)" },
            ] as const
          ).map((o) => (
            <label
              key={o.v}
              className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
                type === o.v
                  ? "border-accent bg-accent/10 text-ink"
                  : "border-border-strong text-muted"
              }`}
            >
              <input
                type="radio"
                name="booking_charge_type"
                value={o.v}
                checked={type === o.v}
                onChange={() => setType(o.v)}
                className="accent-accent"
              />
              {o.l}
            </label>
          ))}
        </div>
        {type !== "full" && (
          <label className="block space-y-1">
            <span className="text-xs font-medium text-ink">
              {type === "percent" ? "Porcentaje a cobrar (1–100)" : "Monto de la seña ($)"}
            </span>
            <input
              name="booking_charge_value"
              type="number"
              min={1}
              max={type === "percent" ? 100 : undefined}
              defaultValue={chargeValue ?? ""}
              placeholder={type === "percent" ? "Ej: 50" : "Ej: 15000"}
              className={inputCls}
            />
          </label>
        )}
        </>
        )}
        {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
        <Button type="submit" size="sm" variant="outline" disabled={pending}>
          {pending ? "Guardando…" : "Guardar cobro de reservas"}
        </Button>
      </form>
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

function CourtsCard({ courts, bands }: { courts: Court[]; bands: Band[] }) {
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
            <CourtRow key={c.id} court={c} bands={bands.filter((b) => b.court_id === c.id)} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function CourtRow({ court, bands }: { court: Court; bands: Band[] }) {
  const { run, pending } = useAction();
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <CourtEditForm court={court} bands={bands} onDone={() => setEditing(false)} />
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
        {bands.length === 0 && court.price_per_slot != null
          ? ` · $${court.price_per_slot}/turno de ${court.slot_minutes}min`
          : ""}
      </p>
      {bands.length > 0 && (
        <p className="mt-1 text-xs text-accent">
          🎾 Entrenamiento:{" "}
          {bands
            .slice()
            .sort((a, b) => a.start_minutes - b.start_minutes)
            .map(
              (b) =>
                `${hhmmLabel(b.start_minutes)}–${hhmmLabel(b.end_minutes)} · clases de ${b.slot_minutes}′${b.price != null ? ` · $${b.price}` : ""}`
            )
            .join("  |  ")}
        </p>
      )}
    </div>
  );
}

function CourtEditForm({
  court,
  bands,
  onDone,
}: {
  court: Court;
  bands: Band[];
  onDone: () => void;
}) {
  const { run, pending, error } = useAction();
  const days = new Set(court.operating_days ?? [1, 2, 3, 4, 5, 6, 7]);

  return (
    <div className="space-y-3">
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
        <div className="block space-y-1">
          <span className="text-xs font-medium text-ink">Nº de cancha</span>
          <div className={`${inputCls} flex items-center text-muted`}>
            #{court.number ?? "—"} · asignado automáticamente
          </div>
        </div>
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
          <span className="text-xs font-medium text-ink">
            Duración del turno <span className="text-muted">(alquiler)</span>
          </span>
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
    <BandsEditor court={court} bands={bands} />
    </div>
  );
}

function BandsEditor({ court, bands }: { court: Court; bands: Band[] }) {
  const { run, pending, error } = useAction();
  const sorted = bands.slice().sort((a, b) => a.start_minutes - b.start_minutes);

  return (
    <div className="space-y-3 rounded-xl border border-accent/40 bg-surface p-4">
      <div>
        <h4 className="text-sm font-bold text-ink">Franja de entrenamiento</h4>
        <p className="text-xs text-muted">
          Marcá el rango horario en que esta cancha se puede usar para clases y la
          duración de la clase (ej. <b>08–16 · clases de 1h</b>). Los turnos se abren a
          esa duración <b>solo los días y horas en que haya un profe disponible</b> — el
          resto del tiempo la cancha se alquila normal en su turno habitual.
        </p>
      </div>

      <div className="space-y-1.5">
        {sorted.length === 0 && (
          <p className="text-xs text-muted">
            Sin franja de entrenamiento — la cancha se alquila en turnos de {court.slot_minutes}′.
          </p>
        )}
        {sorted.map((b) => (
          <div
            key={b.id}
            className="flex items-center justify-between gap-2 rounded-lg border border-border-soft bg-canvas px-3 py-2 text-sm"
          >
            <span className="text-ink">
              <span className="font-mono">{hhmmLabel(b.start_minutes)}–{hhmmLabel(b.end_minutes)}</span>
              {" · "}turnos de <b>{b.slot_minutes}′</b>
              {b.price != null ? ` · $${b.price}` : ""}
            </span>
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => removeCourtBand(b.id))}
              className="text-xs font-semibold text-red-500"
            >
              Quitar
            </button>
          </div>
        ))}
      </div>

      <form
        action={(fd) => run(() => createCourtBand(fd))}
        className="flex flex-wrap items-end gap-2"
      >
        <input type="hidden" name="court_id" value={court.id} />
        <label className="space-y-1">
          <span className="block text-xs text-muted">De (h)</span>
          <input name="from_hour" type="number" min={0} max={23} defaultValue={8} className={`${inputCls} w-16`} />
        </label>
        <label className="space-y-1">
          <span className="block text-xs text-muted">a (h)</span>
          <input name="to_hour" type="number" min={1} max={24} defaultValue={16} className={`${inputCls} w-16`} />
        </label>
        <label className="space-y-1">
          <span className="block text-xs text-muted">Turno</span>
          <select name="slot_minutes" defaultValue="60" className={inputCls}>
            <option value="60">60′ (1 h)</option>
            <option value="90">90′ (1.5 h)</option>
            <option value="120">120′ (2 h)</option>
          </select>
        </label>
        <label className="space-y-1">
          <span className="block text-xs text-muted">Precio</span>
          <input name="price" type="number" min={0} step="any" placeholder="Opc." className={`${inputCls} w-24`} />
        </label>
        <Button size="sm" variant="outline" type="submit" disabled={pending}>
          + Franja
        </Button>
      </form>
      {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
    </div>
  );
}
