"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { ACTIVE_CLUB_COOKIE, getAdminContext } from "@/lib/admin/club";

/** Switch the active club (only to a club the user belongs to). */
export async function setActiveClub(clubId: string): Promise<void> {
  const ctx = await getAdminContext();
  if (!ctx.memberships.some((m) => m.club.id === clubId)) return;

  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_CLUB_COOKIE, clubId, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  });
  revalidatePath("/admin", "layout");
}
