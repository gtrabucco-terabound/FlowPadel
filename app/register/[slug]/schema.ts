import { z } from "zod";
import type { Enums } from "@/lib/database.types";

// Schema compartido entre la server action y el formulario cliente.
// Vive fuera del módulo "use server" porque éste sólo puede exportar funciones
// async; un schema exportado desde allí pierde sus métodos (.omit, etc.).

const genderEnum = z.enum(["male", "female"]);
const categoryNum = z.coerce.number().int().min(1, "Elegí la categoría").max(9);

export const registrationSchema = z.object({
  slug: z.string().min(1),
  player_1_name: z.string().min(2, "Ingresá el nombre").max(80),
  player_1_phone: z.string().min(6, "Ingresá un teléfono válido").max(30),
  player_1_gender: genderEnum,
  player_1_category: categoryNum,
  player_2_name: z.string().max(80).optional().or(z.literal("")),
  player_2_phone: z.string().max(30).optional().or(z.literal("")),
  player_2_gender: genderEnum.optional().nullable(),
  player_2_category: categoryNum.optional().nullable(),
  // Sólo se usa cuando el evento es "combinado": la sub-modalidad elegida.
  modality: z.enum(["caballeros", "damas", "mixto"]).optional().nullable(),
  team_name: z.string().max(80).optional().or(z.literal("")),
});

export type RegistrationInput = z.infer<typeof registrationSchema>;

// Campos de la sección opcional "Crear mi cuenta". Sólo se validan cuando el
// usuario optó por crear cuenta (email + contraseña completos).
export const accountSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
  home_club_id: z.string().optional().or(z.literal("")),
});

export type AccountInput = z.infer<typeof accountSchema>;

// Reclamo de cupo de pareja vía /sumarme/[code].
export const claimSchema = z.object({
  full_name: z.string().min(2, "Ingresá el nombre").max(80),
  gender: genderEnum,
  category: categoryNum,
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
});

export type ClaimInput = z.infer<typeof claimSchema>;

/** Contexto del evento necesario para validar la pareja. */
export interface PairContext {
  isTournament: boolean;
  eventModality: Enums<"tournament_modality"> | null;
  categorySystem: Enums<"category_system"> | null;
  categoryValue: string | null;
}

export interface PairInput {
  player_1_gender: Enums<"gender">;
  player_1_category: number;
  player_2_gender?: Enums<"gender"> | null;
  player_2_category?: number | null;
  modality?: Enums<"tournament_modality"> | "caballeros" | "damas" | "mixto" | null;
}

/**
 * Modalidad efectiva: la del evento, salvo que sea "combinado", en cuyo caso
 * se usa la sub-modalidad elegida por el inscripto.
 */
export function effectiveModality(
  ctx: PairContext,
  chosen: PairInput["modality"]
): Enums<"tournament_modality"> | null {
  if (ctx.eventModality === "combinado") {
    return (chosen as Enums<"tournament_modality"> | null) ?? null;
  }
  return ctx.eventModality;
}

/**
 * Valida la pareja según la modalidad efectiva y el sistema de categoría.
 * Devuelve un mensaje de error (string) o null si es válida.
 * Comparte reglas entre cliente y servidor.
 */
export function validatePair(
  ctx: PairContext,
  input: PairInput
): string | null {
  if (!ctx.isTournament) return null;

  const g1 = input.player_1_gender;
  const g2 = input.player_2_gender ?? null;
  if (!g2) return "Indicá el género del jugador 2.";

  const modality = effectiveModality(ctx, input.modality);
  if (ctx.eventModality === "combinado" && !modality)
    return "Elegí la modalidad para tu pareja.";

  switch (modality) {
    case "caballeros":
      if (g1 !== "male" || g2 !== "male")
        return "En caballeros ambos jugadores deben ser hombres.";
      break;
    case "damas":
      if (g1 !== "female" || g2 !== "female")
        return "En damas ambas jugadoras deben ser mujeres.";
      break;
    case "mixto":
      if (!((g1 === "male" && g2 === "female") || (g1 === "female" && g2 === "male")))
        return "En mixto la pareja debe ser 1 hombre y 1 mujer.";
      break;
    default:
      break;
  }

  if (ctx.categorySystem === "suma") {
    const target = Number(ctx.categoryValue);
    const c1 = input.player_1_category;
    const c2 = input.player_2_category ?? null;
    if (c2 == null) return "Indicá la categoría del jugador 2.";
    if (Number.isFinite(target) && c1 + c2 !== target)
      return `La suma de categorías debe dar ${target}.`;
  }

  return null;
}
