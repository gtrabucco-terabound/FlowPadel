import { getAdminContext } from "@/lib/admin/club";
import { createClient } from "@/lib/supabase/server";
import { SettingsManager } from "@/components/admin/settings-manager";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const ctx = await getAdminContext();
  const supabase = await createClient();

  const [{ data: categories }, { data: courts }] = await Promise.all([
    supabase
      .from("categories")
      .select("id, name")
      .eq("club_id", ctx.activeClubId)
      .order("sort_order", { ascending: true }),
    supabase
      .from("courts")
      .select("id, name, is_active")
      .eq("club_id", ctx.activeClubId)
      .order("name", { ascending: true }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Ajustes</h1>
        <p className="text-sm text-muted">{ctx.activeMembership.club.name}</p>
      </div>
      <SettingsManager categories={categories ?? []} courts={courts ?? []} />
    </div>
  );
}
