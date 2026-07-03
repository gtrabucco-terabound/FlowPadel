"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { submitRegistration } from "@/app/register/[slug]/actions";
import {
  registrationSchema,
  accountSchema,
  validatePair,
  type PairContext,
} from "@/app/register/[slug]/schema";
import { createClient } from "@/lib/supabase/client";
import type { Enums } from "@/lib/database.types";

const clientSchema = registrationSchema.omit({ slug: true });
// Input vs output difieren por z.coerce (categorías: string en el form, number
// tras el parseo). RHF se tipa con el input; la action recibe el output parseado.
type FormInput = z.input<typeof clientSchema>;
type FormValues = z.output<typeof clientSchema>;

export function RegistrationForm({
  slug,
  isTournament,
  eventName,
  eventModality,
  categorySystem,
  categoryValue,
  clubs,
  isLoggedIn = false,
  me = null,
}: {
  slug: string;
  isTournament: boolean;
  eventName: string;
  eventModality: Enums<"tournament_modality"> | null;
  categorySystem: Enums<"category_system"> | null;
  categoryValue: string | null;
  clubs: { id: string; name: string }[];
  isLoggedIn?: boolean;
  me?: {
    full_name: string;
    phone: string | null;
    gender: string | null;
    category: number | null;
  } | null;
}) {
  const [success, setSuccess] = useState(false);
  const [claimCode, setClaimCode] = useState<string | null>(null);
  const [partnerPhone, setPartnerPhone] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  // Sección opcional "Crear mi cuenta".
  const [accountOpen, setAccountOpen] = useState(false);
  const [accountEmail, setAccountEmail] = useState("");
  const [accountPassword, setAccountPassword] = useState("");
  const [accountClubId, setAccountClubId] = useState("");
  const [accountError, setAccountError] = useState<string | null>(null);
  const [accountNotice, setAccountNotice] = useState<string | null>(null);

  const isCombinado = eventModality === "combinado";
  const isSuma = categorySystem === "suma";

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormInput, unknown, FormValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      player_1_name: me?.full_name ?? "",
      player_1_phone: me?.phone ?? "",
      player_1_gender: (me?.gender ?? "") as FormInput["player_1_gender"],
      player_1_category: (me?.category != null
        ? String(me.category)
        : "") as unknown as FormInput["player_1_category"],
      player_2_name: "",
      player_2_phone: "",
      team_name: "",
    },
  });

  const pairCtx: PairContext = {
    isTournament,
    eventModality,
    categorySystem,
    categoryValue,
  };

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    setAccountError(null);
    setAccountNotice(null);

    // Validación de pareja en cliente (espejo del server).
    const pairError = validatePair(pairCtx, {
      player_1_gender: values.player_1_gender,
      player_1_category: values.player_1_category,
      player_2_gender: values.player_2_gender ?? null,
      player_2_category: values.player_2_category ?? null,
      modality: values.modality ?? null,
    });
    if (pairError) {
      setError("root", { message: pairError });
      setServerError(pairError);
      return;
    }

    // Creación de cuenta OPCIONAL. Sólo se intenta si el usuario completó
    // email + contraseña. Nunca bloquea la inscripción.
    if (accountEmail.trim() !== "" || accountPassword.trim() !== "") {
      const parsed = accountSchema.safeParse({
        email: accountEmail.trim(),
        password: accountPassword,
        home_club_id: accountClubId,
      });
      if (!parsed.success) {
        const msg = parsed.error.issues[0]?.message ?? "Datos de cuenta inválidos";
        setAccountError(msg);
        return;
      }

      const supabase = createClient();
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: parsed.data.email,
        password: parsed.data.password,
        options: { data: { full_name: values.player_1_name.trim() } },
      });

      if (signUpError) {
        const already =
          signUpError.message.toLowerCase().includes("already") ||
          signUpError.status === 422;
        setAccountNotice(
          already
            ? "Ese email ya tiene cuenta, podés iniciar sesión. Tu inscripción se envió igual."
            : "No pudimos crear la cuenta, pero tu inscripción se envió igual."
        );
        // No bloqueamos: seguimos con la inscripción anónima.
      } else if (signUpData.user) {
        // Crear/vincular el player row del usuario recién creado. El email
        // se auto-confirma en dev, así que queda logueado.
        await supabase.from("players").insert({
          profile_id: signUpData.user.id,
          full_name: values.player_1_name.trim(),
          email: parsed.data.email,
          phone: values.player_1_phone.trim(),
          gender: values.player_1_gender,
          category: values.player_1_category,
          home_club_id:
            parsed.data.home_club_id && parsed.data.home_club_id !== ""
              ? parsed.data.home_club_id
              : null,
        });
      }
    }

    const res = await submitRegistration({ ...values, slug });
    if (res.ok) {
      setClaimCode(res.claimCode ?? null);
      setPartnerPhone(values.player_2_phone ?? "");
      setSuccess(true);
    } else setServerError(res.error);
  };

  const claimLink =
    claimCode && typeof window !== "undefined"
      ? `${window.location.origin}/sumarme/${claimCode}`
      : "";

  const whatsappPhone = (() => {
    const digits = partnerPhone.replace(/\D/g, "");
    if (!digits) return "";
    if (digits.startsWith("54")) return digits;
    if (digits.length >= 11) return digits;
    return `549${digits}`;
  })();

  const openWhatsApp = () => {
    if (!whatsappPhone || !claimLink) return;
    const message = `Hola! Te inscribí en ${eventName} como mi pareja en FlowPadel. Confirmá tus datos y creá tu cuenta acá: ${claimLink}`;
    const url = `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const copyLink = async () => {
    if (!claimLink) return;
    try {
      await navigator.clipboard.writeText(claimLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  if (success) {
    return (
      <Card>
        <CardContent className="space-y-3 py-10 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-padel-100 text-padel-600">
            ✓
          </div>
          <h2 className="text-xl font-bold text-ink">¡Inscripción enviada!</h2>
          <p className="text-muted">
            Tu inscripción a <strong>{eventName}</strong> quedó pendiente de
            aprobación. El club te contactará para confirmar.
          </p>

          {isTournament && claimCode && (
            <div className="mt-6 space-y-3 rounded-xl border border-black/5 bg-padel-50 p-4 text-left">
              <h3 className="text-sm font-bold text-padel-700">
                Sumá a tu pareja
              </h3>
              <p className="text-center font-mono text-3xl font-bold tracking-widest text-ink">
                {claimCode}
              </p>
              {claimLink && (
                <div className="flex items-center gap-2">
                  <input
                    readOnly
                    value={claimLink}
                    className="w-full rounded-lg border border-border-strong bg-surface px-2.5 py-2 text-xs text-muted"
                  />
                  <Button type="button" onClick={copyLink} className="shrink-0">
                    {copied ? "¡Copiado!" : "Copiar link"}
                  </Button>
                </div>
              )}
              {whatsappPhone && claimLink && (
                <div className="space-y-1">
                  <Button
                    type="button"
                    onClick={openWhatsApp}
                    className="w-full bg-green-600 text-white hover:bg-green-700"
                  >
                    Enviar por WhatsApp
                  </Button>
                  <p className="text-xs text-muted">
                    Tocá para abrir WhatsApp con el mensaje listo para enviarle a
                    tu pareja.
                  </p>
                </div>
              )}
              <p className="text-xs text-muted">
                Compartí este link con tu pareja por WhatsApp. Con él va a poder
                confirmar sus datos y crear su cuenta para recibir avisos y
                seguir su puntaje.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {isTournament && isCombinado && (
        <Field label="Modalidad de tu pareja" error={errors.modality?.message}>
          <select className={inputCls} {...register("modality")}>
            <option value="">Elegí…</option>
            <option value="caballeros">Caballeros</option>
            <option value="damas">Damas</option>
            <option value="mixto">Mixto</option>
          </select>
        </Field>
      )}

      <Fieldset legend="Jugador 1">
        <Field label="Nombre" error={errors.player_1_name?.message}>
          <input className={inputCls} {...register("player_1_name")} />
        </Field>
        <Field label="Teléfono" error={errors.player_1_phone?.message}>
          <input
            className={inputCls}
            inputMode="tel"
            {...register("player_1_phone")}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Género" error={errors.player_1_gender?.message}>
            <select className={inputCls} {...register("player_1_gender")}>
              <option value="">Elegí…</option>
              <option value="male">Hombre</option>
              <option value="female">Mujer</option>
            </select>
          </Field>
          <Field label="Categoría" error={errors.player_1_category?.message}>
            <CategorySelect {...register("player_1_category")} />
          </Field>
        </div>
      </Fieldset>

      {isTournament && (
        <Fieldset legend="Jugador 2 (pareja)">
          <Field label="Nombre" error={errors.player_2_name?.message}>
            <input className={inputCls} {...register("player_2_name")} />
          </Field>
          <Field label="Teléfono" error={errors.player_2_phone?.message}>
            <input
              className={inputCls}
              inputMode="tel"
              {...register("player_2_phone")}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Género" error={errors.player_2_gender?.message}>
              <select className={inputCls} {...register("player_2_gender")}>
                <option value="">Elegí…</option>
                <option value="male">Hombre</option>
                <option value="female">Mujer</option>
              </select>
            </Field>
            <Field label="Categoría" error={errors.player_2_category?.message}>
              <CategorySelect {...register("player_2_category")} />
            </Field>
          </div>
        </Fieldset>
      )}

      {isTournament && isSuma && categoryValue && (
        <p className="rounded-lg bg-padel-50 px-3 py-2 text-xs text-padel-700">
          Modalidad por suma: las categorías de ambos jugadores deben sumar{" "}
          {categoryValue}.
        </p>
      )}

      <Field label="Nombre del equipo (opcional)" error={errors.team_name?.message}>
        <input className={inputCls} {...register("team_name")} />
      </Field>

      {isLoggedIn ? (
        <p className="rounded-xl border border-black/5 bg-surface px-4 py-3 text-xs text-muted">
          Te estás inscribiendo con tu cuenta{me?.full_name ? ` (${me.full_name})` : ""}. Tus
          datos de Jugador 1 ya vienen cargados.
        </p>
      ) : (
      <fieldset className="space-y-3 rounded-xl border border-black/5 bg-surface p-4">
        <button
          type="button"
          onClick={() => setAccountOpen((o) => !o)}
          className="flex w-full items-center justify-between text-left text-sm font-bold text-padel-600"
        >
          <span>Crear mi cuenta (opcional)</span>
          <span className="text-faint">{accountOpen ? "−" : "+"}</span>
        </button>

        {accountOpen && (
          <div className="space-y-3">
            <p className="text-xs text-muted">
              Registrate para recibir avisos de futuros torneos y seguir tu
              puntaje.
            </p>

            <Field label="Email">
              <input
                className={inputCls}
                type="email"
                inputMode="email"
                autoComplete="email"
                value={accountEmail}
                onChange={(e) => setAccountEmail(e.target.value)}
              />
            </Field>

            <Field label="Contraseña">
              <input
                className={inputCls}
                type="password"
                autoComplete="new-password"
                value={accountPassword}
                onChange={(e) => setAccountPassword(e.target.value)}
              />
            </Field>

            {clubs.length > 0 && (
              <Field label="Club que representás (opcional)">
                <select
                  className={inputCls}
                  value={accountClubId}
                  onChange={(e) => setAccountClubId(e.target.value)}
                >
                  <option value="">Sin club</option>
                  {clubs.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </Field>
            )}

            {accountError && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
                {accountError}
              </p>
            )}
          </div>
        )}
      </fieldset>
      )}

      {accountNotice && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
          {accountNotice}
        </p>
      )}

      {serverError && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {serverError}
        </p>
      )}

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "Enviando…" : "Confirmar inscripción"}
      </Button>
    </form>
  );
}

const inputCls =
  "w-full rounded-xl border border-border-strong bg-surface px-3.5 py-2.5 text-ink placeholder:text-faint outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/30";

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

const CategorySelect = (
  props: React.ComponentPropsWithoutRef<"select">
) => (
  <select className={inputCls} defaultValue="" {...props}>
    <option value="">Elegí…</option>
    {CATEGORY_OPTIONS.map((c) => (
      <option key={c.value} value={c.value}>
        {c.label}
      </option>
    ))}
  </select>
);

function Fieldset({
  legend,
  children,
}: {
  legend: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="space-y-3 rounded-xl border border-black/5 bg-surface p-4">
      <legend className="px-1 text-sm font-bold text-padel-600">
        {legend}
      </legend>
      {children}
    </fieldset>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-sm font-medium text-ink">{label}</span>
      {children}
      {error && <span className="block text-xs text-red-600">{error}</span>}
    </label>
  );
}
