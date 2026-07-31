import { getAdminContext } from "@/lib/admin/club";
import { createClient } from "@/lib/supabase/server";
import { ClasesManager } from "@/components/admin/clases-manager";
import {
  listClubCoaches,
  listAvailability,
  listUpcomingLessons,
  listGroupSessions,
} from "@/modules/coaches/repository";
import { listActiveCourtsForClub } from "@/modules/reservations/repository";

export const dynamic = "force-dynamic";

const pad = (n: number) => String(n).padStart(2, "0");
function todayAR(): string {
  const d = new Date(Date.now() - 3 * 3600 * 1000);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

export default async function ClasesPage() {
  const ctx = await getAdminContext();
  const clubId = ctx.activeClubId;
  const supabase = await createClient();

  const [coaches, availability, lessons, groups, courts] = await Promise.all([
    listClubCoaches(supabase, clubId),
    listAvailability(supabase, clubId),
    listUpcomingLessons(supabase, clubId, todayAR()),
    listGroupSessions(supabase, clubId, todayAR()),
    listActiveCourtsForClub(supabase, clubId),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Clases</h1>
        <p className="text-sm text-muted">
          Profesores, su disponibilidad y las clases del club.
        </p>
      </div>
      <ClasesManager
        coaches={coaches}
        availability={availability}
        lessons={lessons}
        groups={groups}
        courts={courts.map((c) => ({ id: c.id, name: c.name, number: c.number }))}
      />
    </div>
  );
}
