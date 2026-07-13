import { getAdminContext } from "@/lib/admin/club";
import { createClient } from "@/lib/supabase/server";
import { OperarManager, type OperarClub } from "@/components/admin/operar-manager";

export const dynamic = "force-dynamic";

export default async function OperarPage() {
  await getAdminContext();
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth?.user?.id ?? "";

  const [{ data: clubs }, { data: myMemberships }, { data: myRequests }] =
    await Promise.all([
      supabase.from("clubs").select("id, name, city").eq("is_active", true).order("name"),
      supabase.from("club_members").select("club_id").eq("profile_id", uid),
      supabase
        .from("club_operator_requests")
        .select("club_id, status")
        .eq("operator_profile_id", uid),
    ]);

  const memberOf = new Set((myMemberships ?? []).map((m) => m.club_id));
  const reqStatus = new Map(
    (myRequests ?? []).map((r) => [r.club_id, r.status as string])
  );

  const rows: OperarClub[] = (clubs ?? [])
    .filter((c) => !memberOf.has(c.id))
    .map((c) => ({
      id: c.id,
      name: c.name,
      city: c.city,
      status: reqStatus.get(c.id) ?? null,
    }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Operar clubes</h1>
        <p className="mt-1 text-sm text-muted">
          Pedí operar las canchas y torneos de un club. Cuando el club aprueba,
          lo vas a poder gestionar desde el selector de club (agenda, turnos,
          torneos y jugadores).
        </p>
      </div>
      <OperarManager clubs={rows} />
    </div>
  );
}
