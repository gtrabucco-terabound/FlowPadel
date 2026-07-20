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
import {
  listClubMembers,
  listPendingOperatorRequests,
} from "@/modules/clubs/repository";

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
  const [membersData, pendingOps] = await Promise.all([
    listClubMembers(supabase, ctx.activeClubId),
    listPendingOperatorRequests(supabase, ctx.activeClubId),
  ]);
  const members = membersData as MemberRow[];
  const operatorRequests = pendingOps as OperatorReq[];

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
