import { getAdminContext } from "@/lib/admin/club";
import { createClient } from "@/lib/supabase/server";
import {
  FixedBookingsManager,
  type FixedCourt,
  type FixedBookingRow,
  type FixedChargeRow,
  type ClientSuggestion,
} from "@/components/admin/fixed-bookings-manager";
import {
  listFixedCourts,
  listFixedBookings,
  listFixedChargesForPeriod,
  listClientSuggestions,
} from "@/modules/reservations/fixed-repository";

export const dynamic = "force-dynamic";

function currentPeriod(): string {
  const now = new Date(Date.now() - 3 * 3600 * 1000);
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

export default async function TurnosFijosPage() {
  const ctx = await getAdminContext();
  const supabase = await createClient();

  const [courtsData, fbData, chargesData, clientsData] = await Promise.all([
    listFixedCourts(supabase, ctx.activeClubId),
    listFixedBookings(supabase, ctx.activeClubId),
    listFixedChargesForPeriod(supabase, ctx.activeClubId, currentPeriod()),
    // Buscador de cliente: jugadores del club + clientes previos de reservas.
    listClientSuggestions(supabase, ctx.activeClubId),
  ]);

  const clients = clientsData as unknown as ClientSuggestion[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Turnos fijos</h1>
        <p className="mt-1 text-sm text-muted">
          Clientes con turno recurrente todas las semanas. Se bloquea la agenda
          del mes y se cobra por adelantado con un link mensual.
        </p>
      </div>
      <FixedBookingsManager
        courts={courtsData as unknown as FixedCourt[]}
        fixedBookings={fbData as unknown as FixedBookingRow[]}
        charges={chargesData as unknown as FixedChargeRow[]}
        clients={clients}
        period={currentPeriod()}
      />
    </div>
  );
}
