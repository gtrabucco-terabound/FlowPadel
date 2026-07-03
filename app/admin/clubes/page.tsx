import { redirect } from "next/navigation";
import { getAdminContext } from "@/lib/admin/club";
import { createClient } from "@/lib/supabase/server";
import {
  ClubesManager,
  type ClubRow,
  type LeadRow,
} from "@/components/admin/clubes-manager";

export const dynamic = "force-dynamic";

export default async function ClubesPage() {
  const ctx = await getAdminContext();
  if (!ctx.superadmin) redirect("/admin");

  const supabase = await createClient();

  const [{ data: clubsData }, { data: membersData }, { data: leadsData }] =
    await Promise.all([
      supabase.from("clubs").select("id, name, city").order("created_at"),
      supabase.from("club_members").select("club_id"),
      supabase
        .from("club_leads")
        .select("id, name, mention_count")
        .is("converted_club_id", null)
        .order("mention_count", { ascending: false })
        .limit(100),
    ]);

  const counts = new Map<string, number>();
  for (const m of membersData ?? []) {
    counts.set(m.club_id, (counts.get(m.club_id) ?? 0) + 1);
  }

  const clubs: ClubRow[] = (clubsData ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    city: c.city,
    admins: counts.get(c.id) ?? 0,
  }));
  const leads: LeadRow[] = leadsData ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Clubes</h1>
        <p className="mt-1 text-sm text-muted">
          Alta y gestión de clubes de la plataforma. Creá clubes, asignales un
          admin y convertí los clubes sugeridos por los jugadores.
        </p>
      </div>
      <ClubesManager clubs={clubs} leads={leads} />
    </div>
  );
}
