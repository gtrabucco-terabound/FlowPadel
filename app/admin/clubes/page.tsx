import { redirect } from "next/navigation";
import { getAdminContext } from "@/lib/admin/club";
import { createClient } from "@/lib/supabase/server";
import {
  ClubesManager,
  type ClubRow,
  type LeadRow,
  type PlanOption,
} from "@/components/admin/clubes-manager";
import {
  listClubsOverview,
  listOpenClubLeads,
} from "@/modules/clubs/repository";
import { listAllPlans } from "@/modules/plans/repository";

export const dynamic = "force-dynamic";

export default async function ClubesPage() {
  const ctx = await getAdminContext();
  if (!ctx.superadmin) redirect("/admin");

  const supabase = await createClient();

  const [clubsData, leadsData, plansData] = await Promise.all([
    listClubsOverview(supabase),
    listOpenClubLeads(supabase),
    listAllPlans(supabase),
  ]);

  const clubs = clubsData as ClubRow[];
  const leads = leadsData as LeadRow[];
  const plans: PlanOption[] = plansData.map((p) => ({ id: p.id, name: p.name }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Clubes</h1>
        <p className="mt-1 text-sm text-muted">
          Alta y gestión de clubes de la plataforma. Creá clubes, asignales un
          admin y convertí los clubes sugeridos por los jugadores.
        </p>
      </div>
      <ClubesManager clubs={clubs} leads={leads} plans={plans} />
    </div>
  );
}
