import Link from "next/link";
import { getAdminContext } from "@/lib/admin/club";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  MembersManager,
  type MemberRow,
} from "@/components/admin/members-manager";
import {
  OperatorRequests,
  type OperatorReq,
} from "@/components/admin/operator-requests";

export const dynamic = "force-dynamic";

export default async function MembersPage() {
  const ctx = await getAdminContext();

  // Solo el club_admin del club activo puede gestionar miembros.
  if (ctx.activeMembership.role !== "club_admin") {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold text-ink">Miembros</h1>
        <Card>
          <CardContent className="space-y-4 py-10 text-center">
            <p className="text-muted">
              Solo el administrador del club puede gestionar miembros.
            </p>
            <Link href="/admin">
              <Button variant="outline" size="sm">
                Volver al panel
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const supabase = await createClient();
  const [{ data }, { data: pendingOps }] = await Promise.all([
    supabase.rpc("list_club_members", { p_club_id: ctx.activeClubId }),
    supabase.rpc("club_operator_pending", { p_club_id: ctx.activeClubId }),
  ]);
  const members = (data ?? []) as MemberRow[];
  const operatorRequests = (pendingOps ?? []) as unknown as OperatorReq[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Miembros</h1>
        <p className="text-sm text-muted">
          Gestioná quién puede administrar este club.
        </p>
      </div>

      <OperatorRequests requests={operatorRequests} />
      <MembersManager members={members} currentUserId={ctx.userId} />
    </div>
  );
}
