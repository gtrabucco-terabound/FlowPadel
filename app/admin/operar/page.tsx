import { getAdminContext } from "@/lib/admin/club";
import { createClient } from "@/lib/supabase/server";
import { OperarManager, type OperarClub } from "@/components/admin/operar-manager";
import { listOperableClubs } from "@/modules/clubs/repository";

export const dynamic = "force-dynamic";

export default async function OperarPage() {
  await getAdminContext();
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth?.user?.id ?? "";

  const rows = (await listOperableClubs(supabase, uid)) as OperarClub[];

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
