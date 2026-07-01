"use server";

import { createClient } from "@/lib/supabase/server";
import {
  registrationSchema,
  validatePair,
  effectiveModality,
  type RegistrationInput,
} from "./schema";

export type RegistrationResult =
  | { ok: true; claimCode?: string }
  | { ok: false; error: string };

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
      "id, club_id, event_type, status, public_visible, modality, category_system, category_value"
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

  const { error: insertErr } = await supabase.from("registrations").insert({
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
  });

  if (insertErr) {
    return {
      ok: false,
      error: "No pudimos registrar tu inscripción. Intentá de nuevo.",
    };
  }

  return claimCode ? { ok: true, claimCode } : { ok: true };
}
