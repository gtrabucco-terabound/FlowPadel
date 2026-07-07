"use server";

import { createClient } from "@/lib/supabase/server";
import {
  registrationSchema,
  validatePair,
  effectiveModality,
  type RegistrationInput,
} from "./schema";

export type RegistrationResult =
  | { ok: true; claimCode?: string; registrationId?: string; onlinePayment?: boolean }
  | { ok: false; error: string };

/** Genera un link de pago (Checkout Pro) para una inscripción pública. */
export async function createRegistrationPaymentLink(
  registrationId: string
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!base || !anon) return { ok: false, error: "Config incompleta." };
  try {
    const res = await fetch(`${base}/functions/v1/mp-create-preference`, {
      method: "POST",
      headers: { Authorization: `Bearer ${anon}`, "Content-Type": "application/json" },
      body: JSON.stringify({ registration_id: registrationId, kind: "deposit" }),
    });
    const data = await res.json();
    if (!res.ok || !data.checkout_url)
      return { ok: false, error: data.error ?? "No se pudo generar el pago." };
    return { ok: true, url: data.checkout_url as string };
  } catch {
    return { ok: false, error: "No pudimos conectar con Mercado Pago." };
  }
}

const CLAIM_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateClaimCode(length = 7): string {
  let out = "";
  for (let i = 0; i < length; i++) {
    out += CLAIM_ALPHABET[Math.floor(Math.random() * CLAIM_ALPHABET.length)];
  }
  return out;
}

export async function submitRegistration(
  input: RegistrationInput
): Promise<RegistrationResult> {
  const parsed = registrationSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  const data = parsed.data;

  const supabase = await createClient();

  // Validate the event is open + public, and get club/event ids + type.
  const { data: event, error: eventErr } = await supabase
    .from("events")
    .select(
      "id, club_id, event_type, status, public_visible, modality, category_system, category_value, deposit_type"
    )
    .eq("slug", data.slug)
    .eq("public_visible", true)
    .eq("status", "open")
    .maybeSingle();

  if (eventErr || !event) {
    return {
      ok: false,
      error: "El evento no está disponible para inscripciones.",
    };
  }

  const isTournament = event.event_type === "tournament";

  // For tournaments, require the partner.
  if (isTournament && !data.player_2_name?.trim()) {
    return {
      ok: false,
      error: "Para un torneo es necesario indicar la pareja (jugador 2).",
    };
  }

  // Validación de pareja (modalidad + categoría) usando la modalidad efectiva.
  const pairError = validatePair(
    {
      isTournament,
      eventModality: event.modality,
      categorySystem: event.category_system,
      categoryValue: event.category_value,
    },
    {
      player_1_gender: data.player_1_gender,
      player_1_category: data.player_1_category,
      player_2_gender: data.player_2_gender ?? null,
      player_2_category: data.player_2_category ?? null,
      modality: data.modality ?? null,
    }
  );
  if (pairError) return { ok: false, error: pairError };

  // Evitar inscripciones duplicadas: si el teléfono ya está inscripto en este
  // torneo (no rechazado), no dejamos anotar de nuevo.
  const { data: taken } = await supabase.rpc("registration_phone_taken", {
    p_event_id: event.id,
    p_phone: data.player_1_phone.trim(),
  });
  if (taken) {
    return {
      ok: false,
      error:
        "Ya hay una inscripción con ese teléfono en este torneo. Si es un error, contactá al club.",
    };
  }

  // Modalidad guardada en la inscripción: sólo aplica para "combinado".
  const storedModality =
    event.modality === "combinado"
      ? effectiveModality(
          {
            isTournament,
            eventModality: event.modality,
            categorySystem: event.category_system,
            categoryValue: event.category_value,
          },
          data.modality ?? null
        )
      : null;

  // Generar un código de reclamo de pareja cuando hay jugador 2 con teléfono
  // (torneo con pareja). Reintenta si choca con uno existente.
  const hasPartner =
    isTournament && !!data.player_2_phone?.trim() && !!data.player_2_name?.trim();
  let claimCode: string | null = null;
  if (hasPartner) {
    for (let attempt = 0; attempt < 8; attempt++) {
      const candidate = generateClaimCode();
      const { data: clash } = await supabase
        .from("registrations")
        .select("id")
        .eq("partner_claim_code", candidate)
        .maybeSingle();
      if (!clash) {
        claimCode = candidate;
        break;
      }
    }
  }

  const { data: inserted, error: insertErr } = await supabase
    .from("registrations")
    .insert({
      club_id: event.club_id,
      event_id: event.id,
      status: "pending",
      player_1_name: data.player_1_name.trim(),
      player_1_phone: data.player_1_phone.trim(),
      player_1_gender: data.player_1_gender,
      player_1_category: data.player_1_category,
      player_2_name: data.player_2_name?.trim() || null,
      player_2_phone: data.player_2_phone?.trim() || null,
      player_2_gender: data.player_2_gender ?? null,
      player_2_category: data.player_2_category ?? null,
      modality: storedModality,
      partner_claim_code: claimCode,
    })
    .select("id")
    .single();

  if (insertErr || !inserted) {
    return {
      ok: false,
      error: "No pudimos registrar tu inscripción. Intentá de nuevo.",
    };
  }

  const onlinePayment = (event.deposit_type ?? "none") !== "none";
  return {
    ok: true,
    claimCode: claimCode ?? undefined,
    registrationId: inserted.id,
    onlinePayment,
  };
}
