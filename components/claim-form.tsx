"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { claimSchema } from "@/app/register/[slug]/schema";
import type { Enums } from "@/lib/database.types";

interface ClaimData {
  event_name: string;
  event_slug: string;
  club_id: string;
  inviter_name: string;
  partner_name: string;
  already_claimed: boolean;
}

type Status = "loading" | "invalid" | "claimed" | "ready" | "done";

const CATEGORY_OPTIONS = [
  { value: "1", label: "1ra" },
  { value: "2", label: "2da" },
  { value: "3", label: "3ra" },
  { value: "4", label: "4ta" },
  { value: "5", label: "5ta" },
  { value: "6", label: "6ta" },
  { value: "7", label: "7ma" },
  { value: "8", label: "8va" },
  { value: "9", label: "9na" },
];

const inputCls =
  "w-full rounded-xl border border-border-strong bg-surface px-3.5 py-2.5 text-ink placeholder:text-faint outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/30";

export function ClaimForm({ code }: { code: string }) {
  const [status, setStatus] = useState<Status>("loading");
  const [claim, setClaim] = useState<ClaimData | null>(null);
  const [hasSession, setHasSession] = useState(false);

  const [fullName, setFullName] = useState("");
  const [gender, setGender] = useState<"" | Enums<"gender">>("");
  const [category, setCategory] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const supabase = createClient();
      const { data: claimRows } = await supabase.rpc("get_registration_claim", {
        p_code: code,
      });
      if (!active) return;
      const row = claimRows?.[0] ?? null;
      if (!row) {
        setStatus("invalid");
        return;
      }
      if (row.already_claimed) {
        setClaim(row);
        setStatus("claimed");
        return;
      }
      const { data: sessionData } = await supabase.auth.getSession();
      if (!active) return;
      setClaim(row);
      setFullName(row.partner_name ?? "");
      setHasSession(!!sessionData.session);
      setStatus("ready");
    })();
    return () => {
      active = false;
    };
  }, [code]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsed = claimSchema.safeParse({
      full_name: fullName.trim(),
      gender,
      category,
      email: email.trim(),
      password,
    });

    // Si ya hay sesión, no exigimos email/password (los ignoramos).
    if (!hasSession && !parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Datos inválidos");
      return;
    }
    // Con sesión: validar sólo nombre/género/categoría.
    if (hasSession) {
      const partial = claimSchema
        .pick({ full_name: true, gender: true, category: true })
        .safeParse({ full_name: fullName.trim(), gender, category });
      if (!partial.success) {
        setError(partial.error.issues[0]?.message ?? "Datos inválidos");
        return;
      }
    }

    setSubmitting(true);
    const supabase = createClient();

    if (!hasSession && parsed.success) {
      const { error: signUpError } = await supabase.auth.signUp({
        email: parsed.data.email,
        password: parsed.data.password,
        options: { data: { full_name: parsed.data.full_name } },
      });
      if (signUpError) {
        const already =
          signUpError.message.toLowerCase().includes("already") ||
          signUpError.status === 422;
        setSubmitting(false);
        setError(
          already
            ? "Ese email ya tiene cuenta, iniciá sesión y volvé a abrir este link."
            : "No pudimos crear la cuenta. Intentá de nuevo."
        );
        return;
      }
    }

    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      setSubmitting(false);
      setError(
        "Necesitás una sesión activa. Iniciá sesión y volvé a abrir este link."
      );
      return;
    }

    const genderValue: Enums<"gender"> = gender === "" ? "male" : gender;
    const { error: claimError } = await supabase.rpc("claim_partner_spot", {
      p_code: code,
      p_full_name: fullName.trim(),
      p_gender: genderValue,
      p_category: Number(category),
    });
    setSubmitting(false);
    if (claimError) {
      setError(
        claimError.message || "No pudimos confirmar tu inscripción."
      );
      return;
    }
    setStatus("done");
  };

  if (status === "loading") {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted">
          Cargando…
        </CardContent>
      </Card>
    );
  }

  if (status === "invalid") {
    return (
      <Card>
        <CardContent className="space-y-2 py-10 text-center">
          <h1 className="text-xl font-bold text-ink">Código inválido</h1>
          <p className="text-muted">
            No encontramos una inscripción con este código.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (status === "claimed") {
    return (
      <Card>
        <CardContent className="space-y-2 py-10 text-center">
          <h1 className="text-xl font-bold text-ink">
            Esta inscripción ya fue reclamada
          </h1>
          <p className="text-muted">
            El cupo de pareja de {claim?.event_name} ya fue confirmado.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (status === "done") {
    return (
      <Card>
        <CardContent className="space-y-3 py-10 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-padel-100 text-padel-600">
            ✓
          </div>
          <h2 className="text-xl font-bold text-ink">
            ¡Listo! Quedaste confirmado/a y tu cuenta está creada.
          </h2>
          <Link
            href="/perfil"
            className="inline-block font-semibold text-padel-600"
          >
            Ir a mi perfil →
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="space-y-5">
        <div>
          <h1 className="text-xl font-bold text-ink">Sumate a tu pareja</h1>
          <p className="text-sm text-muted">
            Estás inscripto/a en <strong>{claim?.event_name}</strong> como
            pareja de <strong>{claim?.inviter_name || "quien te invitó"}</strong>.
            Confirmá tus datos y creá tu cuenta.
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <label className="block space-y-1">
            <span className="text-sm font-medium text-ink">Nombre</span>
            <input
              className={inputCls}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1">
              <span className="text-sm font-medium text-ink">Género</span>
              <select
                className={inputCls}
                value={gender}
                onChange={(e) =>
                  setGender(e.target.value as "" | Enums<"gender">)
                }
              >
                <option value="">Elegí…</option>
                <option value="male">Hombre</option>
                <option value="female">Mujer</option>
              </select>
            </label>
            <label className="block space-y-1">
              <span className="text-sm font-medium text-ink">Categoría</span>
              <select
                className={inputCls}
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="">Elegí…</option>
                {CATEGORY_OPTIONS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {!hasSession && (
            <>
              <label className="block space-y-1">
                <span className="text-sm font-medium text-ink">Email</span>
                <input
                  className={inputCls}
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>
              <label className="block space-y-1">
                <span className="text-sm font-medium text-ink">
                  Contraseña
                </span>
                <input
                  className={inputCls}
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </label>
            </>
          )}

          {hasSession && (
            <p className="rounded-lg bg-padel-50 px-3 py-2 text-xs text-padel-700">
              Ya tenés una sesión activa. Confirmá tus datos para sumarte.
            </p>
          )}

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "Confirmando…" : "Confirmar y sumarme"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
