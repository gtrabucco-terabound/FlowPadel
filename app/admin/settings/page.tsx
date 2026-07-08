import { getAdminContext } from "@/lib/admin/club";
import { createClient } from "@/lib/supabase/server";
import { SettingsManager } from "@/components/admin/settings-manager";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const ctx = await getAdminContext();
  const supabase = await createClient();

  const canEditClub =
    ctx.activeMembership.role === "club_admin" || ctx.superadmin;

  const [{ data: courts }, { data: club }, paymentsRes] = await Promise.all([
    supabase
      .from("courts")
      .select(
        "id, name, is_active, number, enclosure_type, surface, covered, lighting, panoramic, price_per_slot, slot_minutes, operating_days, open_hour, close_hour"
      )
      .eq("club_id", ctx.activeClubId)
      .order("name", { ascending: true }),
    supabase
      .from("clubs")
      .select(
        "id, name, city, address, phone, contact_email, description, instagram, website, logo_url"
      )
      .eq("id", ctx.activeClubId)
      .maybeSingle(),
    canEditClub
      ? supabase
          .from("club_payment_settings")
          .select("mp_connected, booking_charge_type, booking_charge_value, booking_pay_at_club")
          .eq("club_id", ctx.activeClubId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const pay = paymentsRes.data as {
    mp_connected: boolean;
    booking_charge_type: "full" | "percent" | "fixed" | null;
    booking_charge_value: number | null;
    booking_pay_at_club: boolean | null;
  } | null;
  const mpConnected = Boolean(pay?.mp_connected);

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
      />
    </div>
  );
}
