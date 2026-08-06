import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Enums, Tables } from "@/lib/database.types";
import {
  getClubFeatures,
  type ClubFeatures,
  type FeatureKey,
} from "@/modules/plans/repository";

export const ACTIVE_CLUB_COOKIE = "padel_active_club";

export interface AdminMembership {
  id: string;
  role: Enums<"club_member_role">;
  club: Pick<Tables<"clubs">, "id" | "name" | "slug" | "logo_url">;
}

export interface AdminContext {
  userId: string;
  email: string;
  memberships: AdminMembership[];
  activeClubId: string;
  activeMembership: AdminMembership;
  superadmin: boolean;
  features: ClubFeatures;
}

type MembershipRow = {
  id: string;
  role: Enums<"club_member_role">;
  club: Pick<Tables<"clubs">, "id" | "name" | "slug" | "logo_url"> | null;
};

/**
 * Validate the session and resolve the admin context (memberships + active club).
 * Redirects to /login if not authenticated, to / if the user belongs to no club.
 * The active club is read from a cookie; falls back to the first membership.
 */
export async function getAdminContext(): Promise<AdminContext> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data } = await supabase
    .from("club_members")
    .select("id, role, club:clubs(id, name, slug, logo_url)")
    .eq("profile_id", user.id)
    .order("created_at", { ascending: true });

  const rows = (data ?? []) as MembershipRow[];
  const memberships: AdminMembership[] = rows
    .filter((r): r is MembershipRow & { club: NonNullable<MembershipRow["club"]> } => r.club !== null)
    .map((r) => ({ id: r.id, role: r.role, club: r.club }));

  if (memberships.length === 0) redirect("/");

  const { data: profile } = await supabase
    .from("profiles")
    .select("global_role")
    .eq("id", user.id)
    .maybeSingle();
  const superadmin = profile?.global_role === "superadmin";

  const cookieStore = await cookies();
  const cookieClub = cookieStore.get(ACTIVE_CLUB_COOKIE)?.value;
  const activeMembership =
    memberships.find((m) => m.club.id === cookieClub) ?? memberships[0];

  const features = await getClubFeatures(supabase, activeMembership.club.id);

  return {
    userId: user.id,
    email: user.email ?? "",
    memberships,
    activeClubId: activeMembership.club.id,
    activeMembership,
    superadmin,
    features,
  };
}

/**
 * Guard de feature para páginas/acciones: si el club activo no tiene la feature
 * habilitada en su plan, redirige a /admin. El superadmin nunca se bloquea.
 */
export async function requireFeature(feature: FeatureKey): Promise<AdminContext> {
  const ctx = await getAdminContext();
  if (!ctx.superadmin && !ctx.features[feature]) redirect("/admin");
  return ctx;
}

/** Lightweight check used inside server actions: returns active club id + role. */
export async function requireClubAccess(): Promise<{
  clubId: string;
  role: Enums<"club_member_role">;
  userId: string;
}> {
  const ctx = await getAdminContext();
  return {
    clubId: ctx.activeClubId,
    role: ctx.activeMembership.role,
    userId: ctx.userId,
  };
}

/** Slugify a name for event/club slugs. */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}
