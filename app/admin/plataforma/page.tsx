import { redirect } from "next/navigation";
import { getAdminContext } from "@/lib/admin/club";
import { createClient } from "@/lib/supabase/server";
import {
  listAllPlans,
  getPlatformSettings,
} from "@/modules/plans/repository";
import { PlataformaManager } from "@/components/admin/plataforma-manager";

export const dynamic = "force-dynamic";

export default async function PlataformaPage() {
  const ctx = await getAdminContext();
  if (!ctx.superadmin) redirect("/admin");

  const supabase = await createClient();
  const [plans, settings] = await Promise.all([
    listAllPlans(supabase),
    getPlatformSettings(supabase),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Plataforma</h1>
        <p className="text-sm text-muted">
          Planes, Programa Fundadores y textos de la landing.
        </p>
      </div>
      <PlataformaManager plans={plans} settings={settings} />
    </div>
  );
}
