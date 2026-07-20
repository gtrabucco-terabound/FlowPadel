import { getAdminContext } from "@/lib/admin/club";
import { createClient } from "@/lib/supabase/server";
import { SettingsManager } from "@/components/admin/settings-manager";
import { getClubPaymentSettings } from "@/modules/payments/repository";
import {
  listClubCourts,
  getClubInfo,
  getClubOccupancy,
} from "@/modules/clubs/repository";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const ctx = await getAdminContext();
  const supabase = await createClient();

  const canEditClub =
    ctx.activeMembership.role === "club_admin" || ctx.superadmin;

  const [courts, club, pay] = await Promise.all([
    listClubCourts(supabase, ctx.activeClubId),
    getClubInfo(supabase, ctx.activeClubId),
    canEditClub
      ? getClubPaymentSettings(supabase, ctx.activeClubId)
      : Promise.resolve(null),
  ]);
  const mpConnected = Boolean(pay?.mp_connected);

  const occ = canEditClub
    ? await getClubOccupancy(supabase, ctx.activeClubId)
    : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Ajustes</h1>
        <p className="text-sm text-muted">{ctx.activeMembership.club.name}</p>
      </div>
      <SettingsManager
        courts={courts ?? []}
        club={club ?? null}
        canEditClub={canEditClub}
        mpConnected={mpConnected}
        bookingChargeType={pay?.booking_charge_type ?? "full"}
        bookingChargeValue={pay?.booking_charge_value ?? null}
        bookingPayAtClub={pay?.booking_pay_at_club ?? false}
        occupancy={{
          enabled: occ?.enabled ?? false,
          waTarget: occ?.wa_target ?? "",
          discountPct: occ?.discount_pct ?? 30,
          leadMinutes: occ?.lead_minutes ?? 120,
          segmentEnabled: occ?.segment_enabled ?? false,
          segmentDiscountPct: occ?.segment_discount_pct ?? 20,
          segmentMinMatches: occ?.segment_min_matches ?? 3,
          segmentInactiveDays: occ?.segment_inactive_days ?? 21,
          segmentMaxPerRun: occ?.segment_max_per_run ?? 15,
        }}
      />
    </div>
  );
}
